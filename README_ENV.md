# Configuração de Variáveis de Ambiente

## Como configurar

1. **Obtenha as senhas do Terraform:**
   ```bash
   ./get-passwords.sh
   ```

2. **Copie o arquivo de exemplo:**
   ```bash
   cp env.example .env
   ```

3. **Edite o arquivo `.env` com suas configurações:**
   ```bash
   nano .env
   ```
   
   **Importante:** Substitua as senhas `senha-gerada-pelo-terraform` pelos valores obtidos do script acima.

## Variáveis de Ambiente

### Banco de Dados (PostgreSQL)
- `DATABASE_HOST`: Host do banco de dados RDS (fiap-hack-postgres.region.rds.amazonaws.com)
- `DATABASE_PORT`: Porta do banco de dados (5432)
- `DATABASE_NAME`: Nome do banco de dados (fiaphack)
- `DATABASE_USER`: Usuário do banco (postgres)
- `DATABASE_PASSWORD`: Senha gerada automaticamente pelo Terraform

### AWS S3
- `S3_BUCKET_NAME`: Nome do bucket S3
- `S3_REGION`: Região AWS (us-east-1)
- **Nota**: `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` não são necessários quando rodando no EKS com IRSA (IAM Roles for Service Accounts)

### Redis
- `REDIS_HOST`: Host do Redis no Kubernetes (redis-service.redis.svc.cluster.local)
- `REDIS_PORT`: Porta do Redis (6379)
- `REDIS_PASSWORD`: Senha do Redis (redis123456)

### RabbitMQ
- `RABBITMQ_HOST`: Host do RabbitMQ no Kubernetes (rabbitmq.rabbitmq.svc.cluster.local)
- `RABBITMQ_PORT`: Porta do RabbitMQ (5672)
- `RABBITMQ_USER`: Usuário do RabbitMQ (admin)
- `RABBITMQ_PASSWORD`: Senha gerada automaticamente pelo Terraform
- `RABBITMQ_VHOST`: Virtual host (/)

### Email (Gmail)
- `GMAIL_USER`: Email do Gmail
- `GMAIL_APP_PASSWORD`: Senha de app do Gmail

### Serviço de Autenticação
- `AUTH_SERVICE_URL`: URL do serviço de autenticação

### Aplicação
- `NODE_ENV`: Ambiente (development, production)
- `PORT`: Porta da aplicação (3000)

### AWS Cognito
- `AWS_COGNITO_USER_POOL_ID`: ID do User Pool do Cognito
- `AWS_COGNITO_CLIENT_ID`: ID do Client do Cognito

## Exemplo de uso

```bash
# Desenvolvimento local
cp env.example .env
# Edite o .env com suas configurações
npm run start:dev

# Produção (Kubernetes)
# As variáveis são injetadas via ConfigMap/Secret
kubectl apply -f k8s/
```

## Segurança

- **Nunca commite o arquivo `.env`** no repositório
- Use secrets para senhas e chaves sensíveis
- Em produção, use ConfigMaps e Secrets do Kubernetes 