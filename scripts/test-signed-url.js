const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucketName: process.env.S3_BUCKET_NAME || 'fiap-hackaton-v'
};

const s3Client = new S3Client({
  region: s3Config.region,
});

async function testSignedUrl() {
  try {
    console.log('🔧 Configuração S3:');
    console.log(`   Bucket: ${s3Config.bucketName}`);
    console.log(`   Região: ${s3Config.region}`);
    console.log('');

    // Lista alguns arquivos no bucket para testar
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    
    console.log('📋 Listando arquivos no bucket...');
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: s3Config.bucketName,
        MaxKeys: 10,
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('❌ Nenhum arquivo encontrado no bucket');
      return;
    }

    console.log(`✅ Encontrados ${listResponse.Contents.length} arquivos:`);
    listResponse.Contents.forEach((obj, index) => {
      console.log(`   ${index + 1}. ${obj.Key} (${obj.Size} bytes)`);
    });

    // Testa com o primeiro arquivo ZIP encontrado
    const zipFile = listResponse.Contents.find(obj => 
      obj.Key.endsWith('.zip') && obj.Key.startsWith('outputs/')
    );

    if (!zipFile) {
      console.log('❌ Nenhum arquivo ZIP encontrado na pasta outputs/');
      return;
    }

    console.log(`\n🔗 Testando URL assinada para: ${zipFile.Key}`);

    const command = new GetObjectCommand({
      Bucket: s3Config.bucketName,
      Key: zipFile.Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(`✅ URL assinada gerada:`);
    console.log(`   ${signedUrl.substring(0, 100)}...`);

    // Testa o acesso à URL
    console.log('\n🌐 Testando acesso à URL...');
    
    const response = await fetch(signedUrl);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);

    if (response.ok) {
      const buffer = await response.buffer();
      console.log(`   ✅ Download bem-sucedido: ${buffer.length} bytes`);
      
      // Verifica se é um ZIP válido
      if (buffer.length > 0 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
        console.log('   ✅ Arquivo parece ser um ZIP válido (assinatura PK encontrada)');
      } else {
        console.log('   ⚠️ Arquivo não parece ser um ZIP válido');
      }
    } else {
      console.log(`   ❌ Erro no download: ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Erro detalhado: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.name === 'NoSuchBucket') {
      console.error('   O bucket não existe ou não está acessível');
    } else if (error.name === 'AccessDenied') {
      console.error('   Acesso negado - verifique as permissões IAM');
    }
  }
}

testSignedUrl(); 