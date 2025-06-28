#!/bin/bash

set -e

echo "🔄 Aguardando PostgreSQL..."
until docker-compose exec postgres pg_isready -U postgres -d video_processor; do
  echo "⏳ PostgreSQL ainda não está pronto - aguardando..."
  sleep 2
done
echo "✅ PostgreSQL está pronto!"

echo "🔄 Aguardando RabbitMQ..."
until docker-compose exec rabbitmq rabbitmq-diagnostics ping; do
  echo "⏳ RabbitMQ ainda não está pronto - aguardando..."
  sleep 2
done
echo "✅ RabbitMQ está pronto!"

echo "🎉 Todos os serviços estão prontos!"