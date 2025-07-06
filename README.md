# Docker Setup - Video Processor

# Infraestrutura Terraform para ECR

Este diretório contém a configuração Terraform para provisionar um repositório ECR (Elastic Container Registry) na AWS, utilizado para armazenar as imagens Docker do projeto. A infraestrutura está organizada seguindo o padrão dos outros projetos.

## Estrutura

```
ecr/
├── terraform/           # Configurações Terraform
│   ├── main.tf         # Recursos principais
│   ├── variables.tf    # Definição de variáveis
│   ├── outputs.tf      # Outputs do módulo
│   ├── providers.tf    # Configuração de providers
│   └── terraform.tfvars # Valores das variáveis
├── src/                # Código fonte da aplicação
├── Dockerfile          # Imagem Docker para produção
├── .dockerignore       # Arquivos ignorados no build
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

## 🚀 Deploy ECR

### Deploy Completo
Para fazer deploy completo no ECR:
```bash
make deploy
```

Este comando irá:
1. ✅ Verificar pré-requisitos (AWS CLI, Docker)
2. 🏗️ Aplicar infraestrutura Terraform (se necessário)
3. 🐳 Build e push da imagem Docker para ECR
4. 📋 Orientar sobre deploy no Kubernetes (projeto /service)

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

### Pré-requisitos para Deploy
- AWS CLI configurado
- Docker instalado e funcionando
- Permissões adequadas na AWS (ECR)

### Fluxo Completo
1. **ECR** (este projeto): `make deploy`
2. **Kubernetes** (projeto /service): `cd ../service && make deploy`

### ✅ Status Atual
- ✅ Repositório ECR criado: `fiap-hack-production`
- ✅ URL do ECR: `410211328905.dkr.ecr.us-east-1.amazonaws.com/fiap-hack-production`
- ✅ Imagem Docker buildada e enviada com sucesso
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

### RabbitMQ não conecta
```bash
# Verificar logs
make logs-mq

# Reiniciar serviço
docker-compose restart rabbitmq
```

### Portas em uso
```bash
# Verificar o que está usando as portas
lsof -i :5432
lsof -i :5672
lsof -i :15672
```