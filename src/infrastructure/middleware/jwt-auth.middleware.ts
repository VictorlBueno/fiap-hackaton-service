import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoJwtVerifierSingleUserPool } from 'aws-jwt-verify/cognito-verifier';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
  userGroups: string[];
}

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private readonly accessTokenVerifier: CognitoJwtVerifierSingleUserPool<{
    userPoolId: string;
    tokenUse: 'access';
    clientId: string;
  }>;
  private readonly idTokenVerifier: CognitoJwtVerifierSingleUserPool<{
    userPoolId: string;
    tokenUse: 'id';
    clientId: string;
  }>;

  constructor() {
    const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID;
    const clientId = process.env.AWS_COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error(
        'AWS_COGNITO_USER_POOL_ID e AWS_COGNITO_CLIENT_ID são obrigatórios',
      );
    }

    this.accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });

    this.idTokenVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId,
    });
  }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          error: 'Token de autenticação obrigatório',
          message:
            'Forneça um token válido no header Authorization: Bearer <token>',
        });
      }

      const token = authHeader.substring(7);

      const payload = await this.verifyToken(token);

      req.userId = payload.sub;
      req.userEmail = payload.email || payload['cognito:username'] || '';
      
      next();
    } catch (error) {
      console.error('Erro na validação JWT:', error.message);

      return res.status(HttpStatus.UNAUTHORIZED).json({
        error: 'Token inválido',
        message: 'O token fornecido é inválido ou expirado',
      });
    }
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      return await this.accessTokenVerifier.verify(token);
    } catch (accessTokenError) {
      try {
        return await this.idTokenVerifier.verify(token);
      } catch (idTokenError) {
        throw new Error(`Token inválido: ${accessTokenError.message}`);
      }
    }
  }
}
