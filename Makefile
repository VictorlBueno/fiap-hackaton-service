PROJECT_NAME = fiap-hack
ENVIRONMENT = production
AWS_REGION = us-east-1
AWS_ACCOUNT_ID = 410211328905
ECR_REPOSITORY = $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(PROJECT_NAME)-$(ENVIRONMENT)
IMAGE_TAG = latest

.PHONY: build
build:
	@echo "🔨 Construindo imagem Docker..."
	docker build -t $(PROJECT_NAME):$(IMAGE_TAG) .
	@echo "✅ Imagem construída com sucesso!"

.PHONY: build-ecr
build-ecr:
	@echo "🔨 Construindo imagem para ECR..."
	docker build -t $(ECR_REPOSITORY):$(IMAGE_TAG) .
	@echo "✅ Imagem ECR construída com sucesso!"

.PHONY: login-ecr
login-ecr:
	@echo "🔐 Fazendo login no ECR..."
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
	@echo "✅ Login realizado com sucesso!"

.PHONY: push-ecr
push-ecr: login-ecr build-ecr
	@echo "📤 Enviando imagem para ECR..."
	docker push $(ECR_REPOSITORY):$(IMAGE_TAG)
	@echo "✅ Imagem enviada com sucesso!"

.PHONY: terraform-init
terraform-init:
	@echo "🚀 Inicializando Terraform..."
	cd terraform && terraform init
	@echo "✅ Terraform inicializado!"

.PHONY: terraform-plan
terraform-plan:
	@echo "📋 Gerando plano Terraform..."
	cd terraform && terraform plan
	@echo "✅ Plano gerado!"

.PHONY: terraform-apply
terraform-apply:
	@echo "🚀 Aplicando configurações Terraform..."
	cd terraform && terraform apply -auto-approve
	@echo "✅ Configurações aplicadas!"

.PHONY: terraform-destroy
terraform-destroy:
	@echo "🗑️ Destruindo recursos Terraform..."
	cd terraform && terraform destroy -auto-approve
	@echo "✅ Recursos destruídos!"

.PHONY: terraform-output
terraform-output:
	@echo "📤 Exibindo outputs Terraform..."
	cd terraform && terraform output
	@echo "✅ Outputs exibidos!"

.PHONY: terraform-fmt
terraform-fmt:
	@echo "🎨 Formatando arquivos Terraform..."
	cd terraform && terraform fmt -recursive
	@echo "✅ Arquivos formatados!"

.PHONY: terraform-validate
terraform-validate:
	@echo "✅ Validando configuração Terraform..."
	cd terraform && terraform validate
	@echo "✅ Configuração válida!"

.PHONY: k8s-status
k8s-status:
	@echo "📊 Status dos recursos Kubernetes..."
	kubectl get all -n video-processor
	@echo "✅ Status exibido!"

.PHONY: k8s-logs
k8s-logs:
	@echo "📝 Exibindo logs da aplicação..."
	kubectl logs -f deployment/video-processor -n video-processor
	@echo "✅ Logs exibidos!"

.PHONY: k8s-describe
k8s-describe:
	@echo "🔍 Descrevendo recursos Kubernetes..."
	kubectl describe deployment video-processor -n video-processor
	@echo "✅ Descrição exibida!"

.PHONY: k8s-port-forward
k8s-port-forward:
	@echo "🔗 Configurando port-forward..."
	kubectl port-forward service/video-processor-service 8080:80 -n video-processor
	@echo "✅ Port-forward configurado!"

.PHONY: k8s-scale
k8s-scale:
	@if [ -z "$(REPLICAS)" ]; then \
		echo "💡 Use: make k8s-scale REPLICAS=3"; \
	else \
		echo "📈 Escalando para $(REPLICAS) réplicas..."; \
		kubectl scale deployment video-processor --replicas=$(REPLICAS) -n video-processor; \
		echo "✅ Deployment escalado!"; \
	fi

.PHONY: k8s-restart
k8s-restart:
	@echo "🔄 Reiniciando deployment..."
	kubectl rollout restart deployment/video-processor -n video-processor
	@echo "✅ Deployment reiniciado!"

.PHONY: k8s-rollback
k8s-rollback:
	@echo "⏪ Fazendo rollback do deployment..."
	kubectl rollout undo deployment/video-processor -n video-processor
	@echo "✅ Rollback concluído!"

.PHONY: deploy
deploy: push-ecr terraform-apply
	@echo "🚀 Deploy completo realizado!"
	@echo "📊 Verificando status..."
	@make k8s-status

.PHONY: deploy-ecr-only
deploy-ecr-only: push-ecr
	@echo "📦 Apenas ECR atualizado!"

.PHONY: deploy-k8s-only
deploy-k8s-only: terraform-apply
	@echo "☸️ Apenas Kubernetes atualizado!"

.PHONY: dev-build
dev-build:
	@echo "🔨 Construindo para desenvolvimento..."
	docker build -t $(PROJECT_NAME):dev .
	@echo "✅ Build de desenvolvimento concluído!"

.PHONY: dev-run
dev-run: dev-build
	@echo "🚀 Executando aplicação em modo desenvolvimento..."
	docker run -p 3000:3000 --env-file .env $(PROJECT_NAME):dev
	@echo "✅ Aplicação executada!"

.PHONY: dev-stop
dev-stop:
	@echo "🛑 Parando containers de desenvolvimento..."
	docker stop $$(docker ps -q --filter ancestor=$(PROJECT_NAME):dev) 2>/dev/null || true
	@echo "✅ Containers parados!"

.PHONY: clean
clean:
	@echo "🧹 Limpando recursos..."
	docker system prune -f
	@echo "✅ Limpeza concluída!"

.PHONY: clean-images
clean-images:
	@echo "🗑️ Removendo imagens Docker..."
	docker rmi $(PROJECT_NAME):$(IMAGE_TAG) $(PROJECT_NAME):dev 2>/dev/null || true
	@echo "✅ Imagens removidas!"

.PHONY: get-rabbitmq-credentials
get-rabbitmq-credentials:
	@echo "📋 Obtendo credenciais do RabbitMQ..."
	aws secretsmanager get-secret-value --secret-id fiap-hack/rabbitmq-credentials --query SecretString --output text | jq -r '.amqp_url'

.PHONY: get-rabbitmq-status
get-rabbitmq-status:
	@echo "📊 Status do RabbitMQ..."
	@echo "Host: $(shell aws secretsmanager get-secret-value --secret-id fiap-hack/rabbitmq-credentials --query SecretString --output text | jq -r '.host')"
	@echo "Porta AMQP: $(shell aws secretsmanager get-secret-value --secret-id fiap-hack/rabbitmq-credentials --query SecretString --output text | jq -r '.port')"
	@echo "Porta Management: $(shell aws secretsmanager get-secret-value --secret-id fiap-hack/rabbitmq-credentials --query SecretString --output text | jq -r '.management_port')"
	@echo "Management URL: $(shell aws secretsmanager get-secret-value --secret-id fiap-hack/rabbitmq-credentials --query SecretString --output text | jq -r '.management_url')"

.PHONY: eks-create
eks-create:
	@echo "🚀 Criando cluster EKS..."
	cd terraform && terraform apply -auto-approve -target=aws_eks_cluster.main -target=aws_eks_node_group.main
	@echo "✅ Cluster EKS criado!"
	@echo "📋 Configurando kubectl..."
	aws eks update-kubeconfig --name fiap-hack-production --region us-east-1
	@echo "✅ kubectl configurado!"

.PHONY: eks-destroy
eks-destroy:
	@echo "🗑️ Destruindo cluster EKS..."
	cd terraform && terraform destroy -auto-approve
	@echo "✅ Cluster EKS destruído!"

.PHONY: eks-status
eks-status:
	@echo "📊 Status do cluster EKS..."
	aws eks describe-cluster --name fiap-hack-production --region us-east-1 --query 'cluster.{Name:name,Status:status,Version:version,Endpoint:endpoint}' --output table
	@echo "✅ Status exibido!"

.PHONY: get-service-url
get-service-url:
	@echo "🌐 Obtendo URL do serviço..."
	@echo "⏳ Aguardando LoadBalancer ficar disponível..."
	@kubectl wait --for=condition=Ready service/video-processor-service -n video-processor --timeout=300s
	@echo "📋 URL do serviço:"
	@kubectl get service video-processor-service -n video-processor -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "LoadBalancer ainda não disponível"
	@echo ""
	@echo "🔗 Para acessar o serviço:"
	@echo "curl http://\$$(kubectl get service video-processor-service -n video-processor -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/health"
	@echo ""

.PHONY: deploy-eks
deploy-eks: eks-create push-ecr terraform-apply get-service-url
	@echo "🚀 Deploy completo no EKS realizado!"
	@echo "📊 Verificando status..."
	@make k8s-status

.PHONY: help
help:
	@echo "📚 Comandos disponíveis:"
	@echo ""
	@echo "🔨 BUILD:"
	@echo "  build              - Construir imagem Docker"
	@echo "  build-ecr          - Construir imagem para ECR"
	@echo ""
	@echo "📦 ECR:"
	@echo "  login-ecr          - Login no ECR"
	@echo "  push-ecr           - Enviar imagem para ECR"
	@echo ""
	@echo "🏗️ TERRAFORM:"
	@echo "  terraform-init     - Inicializar Terraform"
	@echo "  terraform-plan     - Gerar plano Terraform"
	@echo "  terraform-apply    - Aplicar configurações"
	@echo "  terraform-destroy  - Destruir recursos"
	@echo "  terraform-output   - Exibir outputs"
	@echo "  terraform-fmt      - Formatar arquivos"
	@echo "  terraform-validate - Validar configuração"
	@echo ""
	@echo "☸️ KUBERNETES:"
	@echo "  k8s-status         - Status dos recursos"
	@echo "  k8s-logs           - Logs da aplicação"
	@echo "  k8s-describe       - Descrever recursos"
	@echo "  k8s-port-forward   - Configurar port-forward"
	@echo "  k8s-scale          - Escalar deployment"
	@echo "  k8s-restart        - Reiniciar deployment"
	@echo "  k8s-rollback       - Fazer rollback"
	@echo ""
	@echo "🚀 DEPLOY:"
	@echo "  deploy             - Deploy completo (ECR + K8s)"
	@echo "  deploy-eks         - Deploy completo no EKS (cria cluster + deploy)"
	@echo "  deploy-ecr-only    - Apenas ECR"
	@echo "  deploy-k8s-only    - Apenas Kubernetes"
	@echo ""
	@echo "☁️ EKS:"
	@echo "  eks-create         - Criar cluster EKS"
	@echo "  eks-destroy        - Destruir cluster EKS"
	@echo "  eks-status         - Status do cluster EKS"
	@echo "  get-service-url    - Obter URL do LoadBalancer"
	@echo ""
	@echo "🔧 DESENVOLVIMENTO:"
	@echo "  dev-build          - Build para desenvolvimento"
	@echo "  dev-run            - Executar em desenvolvimento"
	@echo "  dev-stop           - Parar containers de desenvolvimento"
	@echo ""
	@echo "📋 RABBITMQ:"
	@echo "  get-rabbitmq-credentials - Obter URL AMQP do RabbitMQ"
	@echo "  get-rabbitmq-status      - Status do RabbitMQ"
	@echo ""
	@echo "🧹 LIMPEZA:"
	@echo "  clean              - Limpar recursos Docker"
	@echo "  clean-images       - Remover imagens Docker"
	@echo ""
	@echo "❓ AJUDA:"
	@echo "  help               - Exibir esta ajuda"