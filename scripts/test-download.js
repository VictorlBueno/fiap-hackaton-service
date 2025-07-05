const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

async function testDownload() {
  console.log('🧪 Testando download de arquivos do S3...\n');
  
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'fiap-hackaton-v';
  
  console.log(`📋 Configuração:`);
  console.log(`   Região: ${region}`);
  console.log(`   Bucket: ${bucketName}\n`);
  
  const s3Client = new S3Client({ region });
  
  try {
    // Lista arquivos na pasta outputs/
    console.log('📋 Listando arquivos na pasta outputs/...');
    
    // Simula um teste com um arquivo ZIP
    const testKey = 'outputs/test-file.zip';
    
    console.log(`🔗 Gerando URL assinada para: ${testKey}`);
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(`✅ URL assinada gerada: ${signedUrl.substring(0, 100)}...`);
    
    console.log('\n🎯 Para testar o download:');
    console.log(`curl -o test-download.zip "${signedUrl}"`);
    
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    
    if (error.message.includes('NoSuchKey')) {
      console.log('\n💡 O arquivo de teste não existe. Para testar:');
      console.log('1. Faça upload de um vídeo');
      console.log('2. Aguarde o processamento');
      console.log('3. Use o endpoint de download da API');
    }
  }
}

testDownload().catch(console.error); 