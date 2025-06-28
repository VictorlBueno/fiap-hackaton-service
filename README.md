# Docker Setup - Video Processor

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
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_NAME=video_processor

RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

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

## 🧹 Limpeza

```bash
# Parar e remover tudo (incluindo volumes)
make clean
```

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