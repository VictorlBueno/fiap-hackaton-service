#!/bin/bash

echo "🧹 Limpando pastas temporárias..."

# Remove pasta uploads (arquivos já foram enviados para S3)
if [ -d "uploads" ]; then
    echo "📁 Removendo pasta uploads..."
    rm -rf uploads/*
    echo "✅ Pasta uploads limpa!"
else
    echo "📁 Pasta uploads não encontrada"
fi

# Remove pasta outputs (ZIPs já foram enviados para S3)
if [ -d "outputs" ]; then
    echo "📁 Removendo pasta outputs..."
    rm -rf outputs/*
    echo "✅ Pasta outputs limpa!"
else
    echo "📁 Pasta outputs não encontrada"
fi

# Remove pasta temp (frames temporários)
if [ -d "temp" ]; then
    echo "📁 Removendo pasta temp..."
    rm -rf temp/*
    echo "✅ Pasta temp limpa!"
else
    echo "📁 Pasta temp não encontrada"
fi

echo "🎉 Limpeza concluída!" 