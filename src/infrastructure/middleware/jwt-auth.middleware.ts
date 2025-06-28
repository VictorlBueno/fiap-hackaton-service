import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// Extend Request interface para incluir userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                // Para desenvolvimento, permite requests sem token
                req.userId = 'anonymous-user';
                return next();
            }

            const token = authHeader.substring(7); // Remove 'Bearer '

            // Decodifica JWT SEM validar (preparado para AWS Cognito)
            const decoded = jwt.decode(token) as any;

            if (decoded && decoded.sub) {
                req.userId = decoded.sub; // Campo 'sub' do JWT (padrão AWS Cognito)
                console.log(`👤 Usuário autenticado: ${req.userId}`);
            } else {
                req.userId = 'anonymous-user';
                console.warn('⚠️ Token sem campo "sub", usando usuário anônimo');
            }

        } catch (error) {
            console.error('❌ Erro ao decodificar JWT:', error.message);
            req.userId = 'anonymous-user';
        }

        next();
    }
}