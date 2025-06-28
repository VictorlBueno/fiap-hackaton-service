import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
    use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                req.userId = 'anonymous-user';
                return next();
            }

            const token = authHeader.substring(7);
            const decoded = jwt.decode(token) as any;

            if (decoded && decoded.sub) {
                req.userId = decoded.sub;
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