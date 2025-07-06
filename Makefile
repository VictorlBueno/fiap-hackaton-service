.PHONY: help docker-up docker-down docker-logs docker-ps docker-restart docker-clean tf-init tf-plan tf-apply tf-destroy tf-output tf-fmt tf-validate

help: ## Mostrar ajuda completa
	@echo "🚀 Video Processor - Comandos Disponíveis"
	@echo ""
	@echo "📦 DOCKER (Desenvolvimento Local):"
	@grep -E '^docker-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🏗️  TERRAFORM (Infraestrutura AWS):"
	@grep -E '^tf-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🔧 UTILITÁRIOS:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -v '^docker-' | grep -v '^tf-' | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

docker-up: ## Subir todos os serviços Docker
	@echo "🚀 Iniciando serviços Docker..."
	docker-compose up -d
	@echo "✅ Serviços iniciados!"
	@echo "📊 PostgreSQL: localhost:5433"
	@echo "🐰 RabbitMQ UI: http://localhost:15672 (admin/admin123)"

docker-down: ## Parar todos os serviços Docker
	@echo "🛑 Parando serviços Docker..."
	docker-compose down
	@echo "✅ Serviços parados!"

docker-logs: ## Ver logs dos serviços Docker
	docker-compose logs -f

docker-logs-db: ## Ver logs do PostgreSQL
	docker-compose logs -f postgres

docker-logs-mq: ## Ver logs do RabbitMQ
	docker-compose logs -f rabbitmq

docker-ps: ## Listar status dos containers Docker
	docker-compose ps

docker-restart: ## Reiniciar todos os serviços Docker
	@echo "🔄 Reiniciando serviços Docker..."
	docker-compose restart
	@echo "✅ Serviços reiniciados!"

docker-shell-db: ## Conectar no PostgreSQL
	docker-compose exec postgres psql -U postgres -d video_processor

docker-ui-mq: ## Abrir RabbitMQ Management UI
	@echo "🐰 Abrindo RabbitMQ Management UI..."
	@echo "URL: http://localhost:15672"
	@echo "User: admin"
	@echo "Pass: admin123"

docker-list-queues: ## Listar todas as filas do RabbitMQ
	@echo "📋 Listando filas do RabbitMQ..."
	docker-compose exec rabbitmq rabbitmqctl list_queues name messages consumers

docker-clear-queue: ## Limpar fila específica (use QUEUE_NAME=nome_da_fila)
	@echo "🧹 Limpando fila: $(or $(QUEUE_NAME),video_processing_queue)"
	@if [ -z "$(QUEUE_NAME)" ]; then \
		echo "💡 Use: make docker-clear-queue QUEUE_NAME=nome_da_fila"; \
		echo "📋 Filas disponíveis:"; \
		docker-compose exec rabbitmq rabbitmqctl list_queues name; \
	else \
		docker-compose exec rabbitmq rabbitmqctl purge_queue $(QUEUE_NAME); \
		echo "✅ Fila $(QUEUE_NAME) limpa!"; \
	fi

docker-purge-all: ## Limpar todas as filas do RabbitMQ
	@echo "🧹 Limpando todas as filas do RabbitMQ..."
	@docker-compose exec rabbitmq rabbitmqctl list_queues name | grep -v "Listing queues" | while read queue; do \
		if [ ! -z "$$queue" ]; then \
			echo "Limpando fila: $$queue"; \
			docker-compose exec rabbitmq rabbitmqctl purge_queue "$$queue"; \
		fi; \
	done
	@echo "✅ Todas as filas foram limpas!"

docker-clean: ## Limpar volumes e containers Docker
	@echo "🧹 Limpeza completa Docker..."
	docker-compose down -v --remove-orphans || true
	docker container prune -f
	docker volume prune -f
	docker network prune -f
	docker system prune -f
	@echo "✅ Limpeza Docker concluída!"

docker-force-clean: ## Limpeza forçada Docker (remove tudo relacionado ao projeto)
	@echo "💥 Limpeza forçada Docker..."
	docker stop video_processor_db video_processor_mq || true
	docker rm video_processor_db video_processor_mq || true
	docker volume rm fiap-hack_postgres_data fiap-hack_rabbitmq_data || true
	docker network rm video_processor_network || true
	docker image rm postgres:15-alpine rabbitmq:3.12-management-alpine || true
	docker system prune -af
	@echo "✅ Limpeza forçada Docker concluída!"

docker-setup: ## Setup inicial completo Docker
	@echo "🛠️ Setup inicial Docker..."
	docker-compose up -d
	@echo "⏳ Aguardando serviços ficarem prontos..."
	sleep 10
	@echo "✅ Setup Docker concluído!"
	@echo ""
	@echo "📊 PostgreSQL: localhost:5433"
	@echo "🐰 RabbitMQ: localhost:5672"
	@echo "🌐 RabbitMQ UI: http://localhost:15672"
	@echo ""
	@echo "📋 Para conectar na aplicação, use:"
	@echo "   npm run start:dev"

docker-health: ## Verificar saúde dos serviços Docker
	@echo "🏥 Verificando saúde dos serviços Docker..."
	@docker-compose ps
	@echo ""
	@echo "🔍 PostgreSQL:"
	@docker-compose exec postgres pg_isready -U postgres -d video_processor || echo "❌ PostgreSQL não está pronto"
	@echo ""
	@echo "🔍 RabbitMQ:"
	@docker-compose exec rabbitmq rabbitmq-diagnostics ping || echo "❌ RabbitMQ não está pronto"

TF_DIR = terraform
TF = terraform -chdir=$(TF_DIR)

tf-init: ## Inicializar Terraform
	@echo "🏗️ Inicializando Terraform..."
	$(TF) init
	@echo "✅ Terraform inicializado!"

tf-plan: ## Verificar mudanças do Terraform
	@echo "📋 Verificando mudanças do Terraform..."
	$(TF) plan
	@echo "✅ Verificação concluída!"

tf-apply: ## Aplicar mudanças do Terraform
	@echo "🚀 Aplicando mudanças do Terraform..."
	$(TF) apply -auto-approve
	@echo "✅ Mudanças aplicadas!"
	@echo "📋 Para ver os outputs: make tf-output"

tf-destroy: ## Destruir infraestrutura Terraform
	@echo "💥 Destruindo infraestrutura Terraform..."
	$(TF) destroy -auto-approve
	@echo "✅ Infraestrutura destruída!"

tf-output: ## Mostrar outputs do Terraform
	@echo "📤 Outputs do Terraform:"
	$(TF) output

tf-fmt: ## Formatar arquivos Terraform
	@echo "🎨 Formatando arquivos Terraform..."
	$(TF) fmt -recursive
	@echo "✅ Arquivos formatados!"

tf-validate: ## Validar configuração Terraform
	@echo "✅ Validando configuração Terraform..."
	$(TF) validate
	@echo "✅ Configuração válida!"

tf-refresh: ## Atualizar estado do Terraform
	@echo "🔄 Atualizando estado do Terraform..."
	$(TF) refresh
	@echo "✅ Estado atualizado!"

tf-show: ## Mostrar estado atual do Terraform
	@echo "📊 Estado atual do Terraform:"
	$(TF) show

cleanup: ## Limpar pastas temporárias (uploads, outputs, temp)
	@echo "🧹 Limpando pastas temporárias..."
	@./scripts/cleanup.sh

setup: ## Setup completo (Docker + Terraform)
	@echo "🛠️ Setup completo..."
	@echo "📦 Configurando Docker..."
	$(MAKE) docker-setup
	@echo ""
	@echo "🏗️ Configurando Terraform..."
	$(MAKE) tf-init
	@echo ""
	@echo "✅ Setup completo concluído!"

health: ## Verificar saúde geral (Docker + Terraform)
	@echo "🏥 Verificação de saúde geral..."
	@echo ""
	@echo "📦 Docker:"
	$(MAKE) docker-health
	@echo ""
	@echo "🏗️ Terraform:"
	$(MAKE) tf-show

deploy: ## Deploy ECR (build + push)
	@echo "🚀 Iniciando deploy ECR..."
	@echo ""
	@echo "📋 Verificando pré-requisitos..."
	@command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI não encontrado. Instale: https://aws.amazon.com/cli/"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker não encontrado. Instale: https://docker.com/"; exit 1; }
	@echo "✅ Pré-requisitos verificados!"
	@echo ""
	@echo "🏗️ Verificando infraestrutura Terraform..."
	$(MAKE) tf-init
	$(MAKE) tf-plan
	@echo ""
	@echo "❓ Deseja aplicar as mudanças do Terraform? (y/N)"
	@read -p "" -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(MAKE) tf-apply; \
		echo ""; \
		echo "📤 Obtendo URL do repositório ECR..."; \
		ECR_URL=$$($(TF) output -raw repository_url 2>/dev/null || echo ""); \
		if [ -z "$$ECR_URL" ]; then \
			echo "❌ Não foi possível obter a URL do ECR. Verifique se o Terraform foi aplicado."; \
			exit 1; \
		fi; \
		echo "✅ ECR URL: $$ECR_URL"; \
		echo ""; \
		echo "🐳 Build e push da imagem Docker..."; \
		docker build -t $$ECR_URL:latest .; \
		aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $$ECR_URL; \
		docker push $$ECR_URL:latest; \
		echo "✅ Imagem enviada para ECR!"; \
		echo ""; \
		echo "🎉 Deploy ECR concluído!"; \
		echo "📋 Para fazer deploy no Kubernetes, vá para o projeto /service"; \
		echo "📋 Execute: cd ../service && make deploy"; \
	else \
		echo "❌ Deploy cancelado."; \
		exit 1; \
	fi