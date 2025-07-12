declare module 'aws-sdk' {
  // Declaração vazia para evitar erros de TypeScript
  // O projeto usa @aws-sdk/client-s3 (v3) em vez de aws-sdk (v2)
  const AWS: any;
  export = AWS;
} 