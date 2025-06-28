export const cognitoConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
    jwksUri: process.env.COGNITO_JWKS_URI || '',
};