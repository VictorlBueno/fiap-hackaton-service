const { S3Client, ListBucketsCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function checkS3Config() {
  console.log('🔍 Verificando configuração do S3...\n');
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'fiap-hackaton-v';
  
  console.log(`📋 Configuração atual:`);
  console.log(`   Região: ${region}`);
  console.log(`   Bucket: ${bucketName}`);
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'não definido'}`);
  console.log(`   AWS_S3_BUCKET_NAME: ${process.env.AWS_S3_BUCKET_NAME || 'não definido'}\n`);
  
  const s3Client = new S3Client({ region });
  
  try {
    // Lista todos os buckets para verificar conectividade
    console.log('📋 Listando buckets disponíveis...');
    const listResponse = await s3Client.send(new ListBucketsCommand({}));
    
    console.log('✅ Buckets encontrados:');
    listResponse.Buckets.forEach(bucket => {
      console.log(`   - ${bucket.Name} (criado em: ${bucket.CreationDate})`);
    });
    
    // Verifica se o bucket específico existe
    console.log(`\n🔍 Verificando se o bucket '${bucketName}' existe...`);
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`✅ Bucket '${bucketName}' encontrado!`);
    } catch (bucketError) {
      console.log(`❌ Bucket '${bucketName}' não encontrado ou sem acesso.`);
      console.log(`   Erro: ${bucketError.message}`);
      
      if (bucketError.message.includes('NoSuchBucket')) {
        console.log(`\n💡 Sugestões:`);
        console.log(`   1. Verifique se o nome do bucket está correto`);
        console.log(`   2. Verifique se o bucket existe na região ${region}`);
        console.log(`   3. Verifique as permissões da role/função`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Erro ao conectar com S3: ${error.message}`);
    
    if (error.message.includes('endpoint')) {
      console.log(`\n💡 Possível problema de região. Tente:`);
      console.log(`   1. Verificar se AWS_REGION está correto`);
      console.log(`   2. Verificar se o bucket está na região configurada`);
    }
  }
}

checkS3Config().catch(console.error); 