# Docker Setup - Video Processor

# Infraestrutura Terraform para ECR

Este diretório contém a configuração Terraform para provisionar um repositório ECR (Elastic Container Registry) na AWS e a infraestrutura Kubernetes para deploy da aplicação. A infraestrutura está organizada seguindo o padrão dos outros projetos.

## Estrutura

```
ecr/
├── terraform/           # Configurações Terraform
│   ├── main.tf         # Recursos principais
│   ├── variables.tf    # Definição de variáveis
│   ├── outputs.tf      # Outputs do módulo
│   ├── providers.tf    # Configuração de providers
│   └── terraform.tfvars # Valores das variáveis
├── terraform/          # Configurações Terraform
│   ├── main.tf         # Recursos principais
│   ├── variables.tf    # Definição de variáveis
│   ├── outputs.tf      # Outputs do módulo
│   ├── providers.tf    # Configuração de providers
│   └── k8s.tfvars      # Valores das variáveis
├── scripts/            # Scripts de automação
│   └── generate-secret.sh # Geração de secrets a partir do .env
├── src/                # Código fonte da aplicação
├── Dockerfile          # Imagem Docker para produção
├── .dockerignore       # Arquivos ignorados no build
├── env.example         # Exemplo de variáveis de ambiente
├── Makefile           # Comandos de automação
└── README.md          # Este arquivo
```

## Como usar

1. Configure suas credenciais AWS (ex: via `aws configure` ou variáveis de ambiente).
2. Execute os comandos usando o Makefile:
   ```sh
   make tf-init      # Inicializar Terraform
   make tf-plan      # Verificar mudanças
   make tf-apply     # Aplicar mudanças
   make tf-output    # Ver outputs
   ```

## Variáveis

As variáveis seguem o padrão dos outros projetos:
- `aws_region`: Região AWS (padrão: us-east-1)
- `environment`: Ambiente (padrão: production)
- `project_name`: Nome do projeto (padrão: fiap-hack)
- `force_delete`: Permite deletar repositório com imagens (padrão: false)

O nome do repositório será: `{project_name}-{environment}` (ex: fiap-hack-production)

## 🔧 Configuração do Ambiente

### Configuração do .env
Para fazer deploy no Kubernetes, você precisa configurar o arquivo `.env`:

1. **Copie o arquivo de exemplo:**
   ```bash
   cp env.example .env
   ```

2. **Edite o arquivo `.env` com suas configurações:**
   - **RDS**: Endpoint e credenciais do banco de dados
   - **RabbitMQ**: Host e credenciais da fila
   - **AWS**: Credenciais para S3 e outros serviços

3. **Exemplo de configuração:**
   ```bash
   # RDS
   DB_HOST=your-rds-endpoint.amazonaws.com
   DB_PORT=5432
   DB_NAME=fiaphack
   DB_USERNAME=postgres
   DB_PASSWORD=your-db-password
   
   # RabbitMQ
   RABBITMQ_HOST=your-rabbitmq-host
   RABBITMQ_PORT=5672
   RABBITMQ_USERNAME=admin
   RABBITMQ_PASSWORD=admin123
   
   # AWS
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

## 🚀 Deploy ECR

### Deploy Completo
Para fazer deploy completo (ECR + Kubernetes):
```bash
make deploy
```

Este comando irá:
1. ✅ Verificar pré-requisitos (AWS CLI, Docker)
2. 🏗️ Aplicar infraestrutura Terraform (se necessário)
3. 🐳 Build e push da imagem Docker para ECR
4. ☸️ Opcional: Deploy no Kubernetes

### Deploy ECR Apenas
Para fazer deploy apenas no ECR:
```bash
make deploy-ecr
```

### Deploy Infraestrutura
Para aplicar apenas a infraestrutura Terraform:
```bash
make deploy-infra
```

## ☸️ Kubernetes

### Deploy no Kubernetes
Para fazer deploy completo no Kubernetes:
```bash
make deploy
```

Este comando irá:
1. ✅ Verificar kubectl e cluster
2. 🔐 Buscar credenciais do Secrets Manager
3. 📋 Aplicar todos os recursos Kubernetes via Terraform
4. 📊 Verificar status do deploy

**⚠️ Importante:** Certifique-se de que o RabbitMQ e Database estão funcionando antes de executar o deploy.

### Comandos Kubernetes Disponíveis

#### **Deploy e Gerenciamento:**
- `terraform-apply` - Aplicar recursos Terraform
- `terraform-destroy` - Remover recursos Terraform
- `deploy` - Deploy completo (ECR + Kubernetes)
- `deploy-k8s-only` - Apenas Kubernetes

#### **Monitoramento:**
- `k8s-status` - Verificar status dos recursos
- `k8s-logs` - Ver logs dos pods
- `k8s-describe` - Descrever recursos

#### **Operações:**
- `k8s-scale` - Escalar deployment
- `k8s-restart` - Reiniciar deployment
- `k8s-rollback` - Fazer rollback
- `k8s-port-forward` - Port-forward para service

### Recursos Kubernetes

#### **Deployment:**
- 2 réplicas inicialmente
- Auto-scaling: 2-10 réplicas baseado em CPU (70%) e memória (80%)
- Rolling update com zero downtime
- Health checks configurados

#### **Recursos:**
- Requests: 256Mi RAM, 250m CPU
- Limits: 512Mi RAM, 500m CPU

#### **Networking:**
- Service ClusterIP na porta 80
- Ingress com Nginx para acesso externo
- Host: video-processor.local

#### **Armazenamento:**
- Volumes temporários para uploads e outputs
- Configuração para S3 (via AWS credentials)

### Integração com Outros Projetos

O arquivo `.env` deve conter as configurações dos outros projetos:
- **RDS**: Endpoint, credenciais do banco
- **RabbitMQ**: Host, credenciais da fila
- **AWS**: Credenciais para S3 e outros serviços

#### Configuração do .env:
1. Copie o arquivo de exemplo: `cp env.example .env`
2. Edite o arquivo `.env` com suas configurações
3. Execute: `make deploy` para fazer deploy completo

### Pré-requisitos para Deploy
- AWS CLI configurado
- Docker instalado e funcionando
- kubectl configurado para o cluster correto
- Permissões adequadas na AWS (ECR, EKS)
- Cluster Kubernetes com Nginx Ingress Controller

### ✅ Status Atual
- ✅ Repositório ECR criado: `fiap-hack-production`
- ✅ URL do ECR: `410211328905.dkr.ecr.us-east-1.amazonaws.com/fiap-hack-production`
- ✅ Imagem Docker buildada e enviada com sucesso
- ✅ Manifests Kubernetes criados
- ✅ Scripts de automação configurados
- ✅ Pronto para deploy no Kubernetes

## 🚀 Início Rápido

```bash
# Subir todos os serviços
make setup

# Ou manualmente
docker-compose up -d
```

## 📋 Serviços

### PostgreSQL
- **Porta**: 5432
- **Database**: video_processor
- **User**: postgres
- **Password**: postgres123

### RabbitMQ
- **AMQP Port**: 5672
- **Management UI**: http://localhost:15672
- **User**: admin
- **Password**: admin123

## 🛠️ Comandos Úteis

```bash
# Ver todos os comandos disponíveis
make help

# Subir serviços
make up

# Ver logs
make logs

# Conectar no banco
make db-shell

# Abrir RabbitMQ UI
make mq-ui

# Parar tudo
make down

# Limpar volumes
make clean
```

## 🔧 Configuração da Aplicação

Certifique-se que o arquivo `.env` está configurado:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_NAME=video_processor

# RabbitMQ Configuration
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=video-processor-bucket

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
```

> **Nota:** Em ambiente AWS Lambda, não é necessário definir `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`. O Lambda já assume uma role IAM com permissões apropriadas automaticamente.

### 📦 Configuração do S3

1. **Crie um bucket S3** na AWS
2. **Configure as permissões da role do Lambda** para permitir upload/download
3. **Configure as variáveis** no arquivo `.env` (veja acima)
4. **Copie o arquivo de exemplo**: `cp env.example .env`

## 🏥 Health Check

```bash
# Verificar se os serviços estão funcionando
make health

# Verificar status dos containers
make ps
```

## 📊 Monitoramento

- **PostgreSQL**: Use `make db-shell` para conectar
- **RabbitMQ**: Acesse http://localhost:15672 para o painel de controle
- **S3**: Verifique os arquivos no console da AWS S3

## ☁️ Armazenamento S3

O serviço agora utiliza o Amazon S3 para armazenamento de arquivos:

- **Vídeos**: São enviados para o S3 após upload
- **ZIPs**: Os arquivos ZIP com frames são criados no S3
- **Downloads**: URLs assinadas são geradas para download seguro
- **Limpeza**: Arquivos temporários são removidos automaticamente

## 🧹 Limpeza

```bash
# Limpar pastas temporárias (uploads, outputs, temp)
make cleanup

# Parar e remover tudo (incluindo volumes)
make clean
```

### 📁 Pastas Temporárias

O projeto usa as seguintes pastas temporárias que são limpas automaticamente:

- **`uploads/`**: Arquivos de vídeo temporários (enviados para S3)
- **`outputs/`**: Arquivos ZIP temporários (enviados para S3)  
- **`temp/`**: Frames extraídos temporários (removidos após processamento)

> **Nota**: Use `make cleanup` para limpar manualmente essas pastas.

## 🔍 Solução de Problemas

### PostgreSQL não conecta
```bash
# Verificar logs
make logs-db

# Reiniciar serviço
docker-compose restart postgres
```

# Video Processor - ECR e Kubernetes

Este projeto contém a configuração para deploy do Video Processor no AWS ECR e Kubernetes usando Terraform.

## 📋 Pré-requisitos

- [AWS CLI](https://aws.amazon.com/cli/) configurado
- [Docker](https://docker.com/) instalado
- [Terraform](https://terraform.io/) instalado
- [kubectl](https://kubernetes.io/docs/tasks/tools/) configurado
- Acesso ao cluster Kubernetes (EKS)

## 🏗️ Arquitetura

O projeto utiliza:
- **AWS ECR**: Repositório de imagens Docker
- **Kubernetes**: Orquestração de containers
- **Terraform**: Infraestrutura como código
- **RDS**: Banco de dados PostgreSQL
- **RabbitMQ**: Message broker

## 📁 Estrutura do Projeto

```
ecr/
├── terraform/
│   ├── main.tf              # Recursos ECR e Kubernetes
│   ├── variables.tf         # Variáveis Terraform
│   ├── outputs.tf           # Outputs Terraform
│   ├── providers.tf         # Providers AWS e Kubernetes
│   └── k8s.tfvars          # Valores das variáveis
├── Dockerfile              # Imagem Docker da aplicação
├── Makefile               # Comandos automatizados
└── README.md              # Este arquivo
```

## 🚀 Deploy

### 1. Configuração Inicial

```bash
# Inicializar Terraform
make terraform-init

# Verificar plano
make terraform-plan
```

### 2. Deploy Completo

```bash
# Deploy completo (ECR + Kubernetes)
make deploy
```

### 3. Deploy Parcial

```bash
# Apenas ECR
make deploy-ecr-only

# Apenas Kubernetes
make deploy-k8s-only
```

## 🔧 Comandos Disponíveis

### Docker
- `make build` - Construir imagem Docker
- `make build-ecr` - Construir imagem para ECR
- `make login-ecr` - Login no ECR
- `make push-ecr` - Enviar imagem para ECR

### Terraform
- `make terraform-init` - Inicializar Terraform
- `make terraform-plan` - Gerar plano Terraform
- `make terraform-apply` - Aplicar configurações
- `make terraform-destroy` - Destruir recursos
- `make terraform-output` - Exibir outputs
- `make terraform-fmt` - Formatar arquivos
- `make terraform-validate` - Validar configuração

### Kubernetes
- `make k8s-status` - Status dos recursos
- `make k8s-logs` - Logs da aplicação
- `make k8s-describe` - Descrever recursos
- `make k8s-port-forward` - Configurar port-forward
- `make k8s-scale REPLICAS=3` - Escalar deployment
- `make k8s-restart` - Reiniciar deployment
- `make k8s-rollback` - Fazer rollback

### Desenvolvimento
- `make dev-build` - Build para desenvolvimento
- `make dev-run` - Executar em desenvolvimento
- `make dev-stop` - Parar containers de desenvolvimento

### Limpeza
- `make clean` - Limpar recursos Docker
- `make clean-images` - Remover imagens Docker

### Ajuda
- `make help` - Exibir ajuda completa

## ⚙️ Configuração

### Variáveis do Terraform

As variáveis são configuradas no arquivo `terraform/k8s.tfvars`:

```hcl
# Configurações do banco de dados
db_host = "fiap-hack-production.cqjqjqjqjqjq.us-east-1.rds.amazonaws.com"
db_port = "5432"
db_name = "fiaphack"
db_username = "postgres"
db_password = "fiap-hack-2024!"

# Configurações do RabbitMQ
rabbitmq_host = "rabbitmq-service.rabbitmq.svc.cluster.local"
rabbitmq_port = "5672"
rabbitmq_username = "admin"
rabbitmq_password = "admin123"

# Configurações AWS
aws_region = "us-east-1"
aws_access_key_id = "AKIAIOSFODNN7EXAMPLE"
aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Configurações da aplicação
app_name = "video-processor"
app_namespace = "video-processor"
app_replicas = 2
app_image = "410211328905.dkr.ecr.us-east-1.amazonaws.com/fiap-hack-production:latest"
```

### Recursos Criados

O Terraform cria os seguintes recursos:

1. **ECR Repository**: Repositório para imagens Docker
2. **Kubernetes Namespace**: Namespace `video-processor`
3. **ConfigMap**: Configurações da aplicação
4. **Secret**: Credenciais sensíveis
5. **Deployment**: Aplicação com 2 réplicas
6. **Service**: ClusterIP para comunicação interna
7. **Ingress**: Roteamento externo
8. **HPA**: Auto-scaling baseado em CPU e memória

## 🔍 Monitoramento

### Verificar Status

```bash
# Status geral
make k8s-status

# Logs da aplicação
make k8s-logs

# Descrição detalhada
make k8s-describe
```

### Port-Forward

```bash
# Acessar aplicação localmente
make k8s-port-forward
```

A aplicação estará disponível em `http://localhost:8080`

## 🔄 Atualizações

### Atualizar Imagem

```bash
# Build e push da nova imagem
make push-ecr

# Aplicar no Kubernetes
make terraform-apply
```

### Escalar Aplicação

```bash
# Escalar para 5 réplicas
make k8s-scale REPLICAS=5
```

## 🧹 Limpeza

### Remover Recursos

```bash
# Destruir infraestrutura
make terraform-destroy

# Limpar imagens Docker
make clean-images
```

## 🔐 Segurança

- Credenciais sensíveis são armazenadas em Kubernetes Secrets
- Configurações não-sensíveis em ConfigMaps
- Acesso ao ECR via IAM roles
- Rede isolada no Kubernetes

## 📊 Recursos

### Limites de Recursos

- **CPU**: 250m request, 500m limit
- **Memória**: 256Mi request, 512Mi limit

### Auto-Scaling

- **Mínimo**: 2 réplicas
- **Máximo**: 10 réplicas
- **Target CPU**: 70%
- **Target Memory**: 80%

## 🆘 Troubleshooting

### Problemas Comuns

1. **Erro de login no ECR**
   ```bash
   make login-ecr
   ```

2. **Pods não iniciam**
   ```bash
   make k8s-describe
   make k8s-logs
   ```

3. **Imagem não encontrada**
   ```bash
   make push-ecr
   make terraform-apply
   ```

4. **Recursos não criados**
   ```bash
   make terraform-plan
   make terraform-apply
```

### Logs e Debug

```bash
# Logs da aplicação
make k8s-logs

# Status dos pods
kubectl get pods -n video-processor

# Descrição do deployment
kubectl describe deployment video-processor -n video-processor
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs: `make k8s-logs`
2. Consulte a documentação do Terraform
3. Verifique a configuração no `k8s.tfvars`