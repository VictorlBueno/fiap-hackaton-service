# Video Processor - Docker Commands

.PHONY: help up down logs ps clean restart db-shell mq-ui mq-clear-queue mq-list-queues mq-purge-all cleanup

help: ## Mostrar ajuda
	@echo "Comandos disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Subir todos os serviços
	@echo "🚀 Iniciando serviços..."
	docker-compose up -d
	@echo "✅ Serviços iniciados!"
	@echo "📊 PostgreSQL: localhost:5433"
	@echo "🐰 RabbitMQ UI: http://localhost:15672 (admin/admin123)"

down: ## Parar todos os serviços
	@echo "🛑 Parando serviços..."
	docker-compose down
	@echo "✅ Serviços parados!"

logs: ## Ver logs dos serviços
	docker-compose logs -f

logs-db: ## Ver logs do PostgreSQL
	docker-compose logs -f postgres

logs-mq: ## Ver logs do RabbitMQ
	docker-compose logs -f rabbitmq

ps: ## Listar status dos containers
	docker-compose ps

restart: ## Reiniciar todos os serviços
	@echo "🔄 Reiniciando serviços..."
	docker-compose restart
	@echo "✅ Serviços reiniciados!"

db-shell: ## Conectar no PostgreSQL
	docker-compose exec postgres psql -U postgres -d video_processor

mq-ui: ## Abrir RabbitMQ Management UI
	@echo "🐰 Abrindo RabbitMQ Management UI..."
	@echo "URL: http://localhost:15672"
	@echo "User: admin"
	@echo "Pass: admin123"

mq-list-queues: ## Listar todas as filas do RabbitMQ
	@echo "📋 Listando filas do RabbitMQ..."
	docker-compose exec rabbitmq rabbitmqctl list_queues name messages consumers

mq-clear-queue: ## Limpar fila específica (use QUEUE_NAME=nome_da_fila)
	@echo "🧹 Limpando fila: $(or $(QUEUE_NAME),video_processing_queue)"
	@if [ -z "$(QUEUE_NAME)" ]; then \
		echo "💡 Use: make mq-clear-queue QUEUE_NAME=nome_da_fila"; \
		echo "📋 Filas disponíveis:"; \
		docker-compose exec rabbitmq rabbitmqctl list_queues name; \
	else \
		docker-compose exec rabbitmq rabbitmqctl purge_queue $(QUEUE_NAME); \
		echo "✅ Fila $(QUEUE_NAME) limpa!"; \
	fi

mq-purge-all: ## Limpar todas as filas do RabbitMQ
	@echo "🧹 Limpando todas as filas do RabbitMQ..."
	@docker-compose exec rabbitmq rabbitmqctl list_queues name | grep -v "Listing queues" | while read queue; do \
		if [ ! -z "$$queue" ]; then \
			echo "Limpando fila: $$queue"; \
			docker-compose exec rabbitmq rabbitmqctl purge_queue "$$queue"; \
		fi; \
	done
	@echo "✅ Todas as filas foram limpas!"

cleanup: ## Limpar pastas temporárias (uploads, outputs, temp)
	@echo "🧹 Limpando pastas temporárias..."
	@./scripts/cleanup.sh

clean: ## Limpar volumes e containers
	@echo "🧹 Limpeza completa..."
	docker-compose down -v --remove-orphans || true
	docker container prune -f
	docker volume prune -f
	docker network prune -f
	docker system prune -f
	@echo "✅ Limpeza concluída!"

force-clean: ## Limpeza forçada (remove tudo relacionado ao projeto)
	@echo "💥 Limpeza forçada..."
	docker stop video_processor_db video_processor_mq || true
	docker rm video_processor_db video_processor_mq || true
	docker volume rm fiap-hack_postgres_data fiap-hack_rabbitmq_data || true
	docker network rm video_processor_network || true
	docker image rm postgres:15-alpine rabbitmq:3.12-management-alpine || true
	docker system prune -af
	@echo "✅ Limpeza forçada concluída!"

setup: ## Setup inicial completo
	@echo "🛠️ Setup inicial..."
	docker-compose up -d
	@echo "⏳ Aguardando serviços ficarem prontos..."
	sleep 10
	@echo "✅ Setup concluído!"
	@echo ""
	@echo "📊 PostgreSQL: localhost:5433"
	@echo "🐰 RabbitMQ: localhost:5672"
	@echo "🌐 RabbitMQ UI: http://localhost:15672"
	@echo ""
	@echo "📋 Para conectar na aplicação, use:"
	@echo "   npm run start:dev"

health: ## Verificar saúde dos serviços
	@echo "🏥 Verificando saúde dos serviços..."
	@docker-compose ps
	@echo ""
	@echo "🔍 PostgreSQL:"
	@docker-compose exec postgres pg_isready -U postgres -d video_processor || echo "❌ PostgreSQL não está pronto"
	@echo ""
	@echo "🔍 RabbitMQ:"
	@docker-compose exec rabbitmq rabbitmq-diagnostics ping || echo "❌ RabbitMQ não está pronto"