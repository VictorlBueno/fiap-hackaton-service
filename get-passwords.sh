#!/bin/bash

echo "=== Obtendo senhas do Terraform ==="
echo

echo "Senha do Banco de Dados PostgreSQL:"
cd ../database/terraform
terraform output db_password
echo

echo "Senha do RabbitMQ:"
cd ../../rabbitmq/terraform
terraform output rabbitmq_password
echo

echo "=== Endpoints dos serviços ==="
echo

echo "Endpoint do Banco de Dados:"
cd ../database/terraform
terraform output db_endpoint
echo

echo "=== Como usar ==="
echo "1. Copie o arquivo env.example para .env:"
echo "   cp env.example .env"
echo
echo "2. Substitua as senhas 'senha-gerada-pelo-terraform' pelos valores acima"
echo "3. Ajuste o DATABASE_HOST com o endpoint correto"
echo
echo "Para Redis, a senha já está correta: redis123456" 