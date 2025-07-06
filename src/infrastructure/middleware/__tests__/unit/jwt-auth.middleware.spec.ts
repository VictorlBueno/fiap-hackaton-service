import { HttpStatus } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {AuthenticatedRequest, JwtAuthMiddleware} from "../../jwt-auth.middleware";

jest.mock('aws-jwt-verify');

describe('JWT Authentication Middleware', () => {
    let middleware: JwtAuthMiddleware;
    let mockRequest: Partial<AuthenticatedRequest>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockAccessVerifier: any;
    let mockIdVerifier: any;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        mockAccessVerifier = {
            verify: jest.fn(),
        };
        mockIdVerifier = {
            verify: jest.fn(),
        };

        const MockedCognitoJwtVerifier = CognitoJwtVerifier as jest.Mocked<typeof CognitoJwtVerifier>;
        MockedCognitoJwtVerifier.create = jest.fn()
            .mockReturnValueOnce(mockAccessVerifier)
            .mockReturnValueOnce(mockIdVerifier);

        mockRequest = {
            headers: {},
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('Given middleware initialization requirements', () => {
        describe('When required environment variables are present', () => {
            it('Should create verifiers with correct configuration', () => {
                process.env.AWS_COGNITO_USER_POOL_ID = 'test-pool-id';
                process.env.AWS_COGNITO_CLIENT_ID = 'test-client-id';

                new JwtAuthMiddleware();

                expect(CognitoJwtVerifier.create).toHaveBeenCalledTimes(2);
                expect(CognitoJwtVerifier.create).toHaveBeenNthCalledWith(1, {
                    userPoolId: 'test-pool-id',
                    tokenUse: 'access',
                    clientId: 'test-client-id',
                });
                expect(CognitoJwtVerifier.create).toHaveBeenNthCalledWith(2, {
                    userPoolId: 'test-pool-id',
                    tokenUse: 'id',
                    clientId: 'test-client-id',
                });
            });
        });

        describe('When AWS_COGNITO_USER_POOL_ID is missing', () => {
            it('Should throw configuration error', () => {
                delete process.env.AWS_COGNITO_USER_POOL_ID;
                process.env.AWS_COGNITO_CLIENT_ID = 'test-client-id';

                expect(() => new JwtAuthMiddleware()).toThrow(
                    'AWS_COGNITO_USER_POOL_ID e AWS_COGNITO_CLIENT_ID são obrigatórios'
                );
            });
        });

        describe('When AWS_COGNITO_CLIENT_ID is missing', () => {
            it('Should throw configuration error', () => {
                process.env.AWS_COGNITO_USER_POOL_ID = 'test-pool-id';
                delete process.env.AWS_COGNITO_CLIENT_ID;

                expect(() => new JwtAuthMiddleware()).toThrow(
                    'AWS_COGNITO_USER_POOL_ID e AWS_COGNITO_CLIENT_ID são obrigatórios'
                );
            });
        });

        describe('When both environment variables are missing', () => {
            it('Should throw configuration error', () => {
                delete process.env.AWS_COGNITO_USER_POOL_ID;
                delete process.env.AWS_COGNITO_CLIENT_ID;

                expect(() => new JwtAuthMiddleware()).toThrow(
                    'AWS_COGNITO_USER_POOL_ID e AWS_COGNITO_CLIENT_ID são obrigatórios'
                );
            });
        });
    });

    describe('Given authentication header validation requirements', () => {
        beforeEach(() => {
            process.env.AWS_COGNITO_USER_POOL_ID = 'test-pool-id';
            process.env.AWS_COGNITO_CLIENT_ID = 'test-client-id';
            middleware = new JwtAuthMiddleware();
        });

        describe('When authorization header is missing', () => {
            it('Should return unauthorized status with appropriate message', async () => {
                mockRequest.headers = {};

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: 'Token de autenticação obrigatório',
                    message: 'Forneça um token válido no header Authorization: Bearer <token>',
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe('When authorization header does not start with Bearer', () => {
            it('Should return unauthorized status', async () => {
                mockRequest.headers = {
                    authorization: 'Basic some-token',
                };

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: 'Token de autenticação obrigatório',
                    message: 'Forneça um token válido no header Authorization: Bearer <token>',
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe('When authorization header has Bearer without token', () => {
            it('Should return unauthorized status', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer',
                };

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
                expect(mockNext).not.toHaveBeenCalled();
            });
        });
    });

    describe('Given token verification requirements', () => {
        beforeEach(() => {
            process.env.AWS_COGNITO_USER_POOL_ID = 'test-pool-id';
            process.env.AWS_COGNITO_CLIENT_ID = 'test-client-id';
            middleware = new JwtAuthMiddleware();
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };
        });

        describe('When access token verification succeeds', () => {
            it('Should set userId and call next middleware', async () => {
                const mockPayload = { sub: 'user-123' };
                mockAccessVerifier.verify.mockResolvedValue(mockPayload);

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockAccessVerifier.verify).toHaveBeenCalledWith('valid-token');
                expect(mockRequest.userId).toBe('user-123');
                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });
        });

        describe('When access token fails but id token succeeds', () => {
            it('Should verify with id token and proceed', async () => {
                const mockPayload = { sub: 'user-456' };
                mockAccessVerifier.verify.mockRejectedValue(new Error('Access token invalid'));
                mockIdVerifier.verify.mockResolvedValue(mockPayload);

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockAccessVerifier.verify).toHaveBeenCalledWith('valid-token');
                expect(mockIdVerifier.verify).toHaveBeenCalledWith('valid-token');
                expect(mockRequest.userId).toBe('user-456');
                expect(mockNext).toHaveBeenCalled();
            });
        });

        describe('When both token verifications fail', () => {
            it('Should return unauthorized with error message', async () => {
                const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
                mockAccessVerifier.verify.mockRejectedValue(new Error('Access token expired'));
                mockIdVerifier.verify.mockRejectedValue(new Error('ID token invalid'));

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: 'Token inválido',
                    message: 'O token fornecido é inválido ou expirado',
                });
                expect(mockNext).not.toHaveBeenCalled();
                expect(consoleErrorSpy).toHaveBeenCalledWith('Erro na validação JWT:', 'Token inválido: Access token expired');

                consoleErrorSpy.mockRestore();
            });
        });
    });

    describe('Given error handling requirements', () => {
        beforeEach(() => {
            process.env.AWS_COGNITO_USER_POOL_ID = 'test-pool-id';
            process.env.AWS_COGNITO_CLIENT_ID = 'test-client-id';
            middleware = new JwtAuthMiddleware();
            mockRequest.headers = {
                authorization: 'Bearer invalid-token',
            };
        });

        describe('When token verification throws unexpected error', () => {
            it('Should log error and return unauthorized', async () => {
                const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
                mockAccessVerifier.verify.mockRejectedValue(new Error('Network error'));
                mockIdVerifier.verify.mockRejectedValue(new Error('Service unavailable'));

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(consoleErrorSpy).toHaveBeenCalledWith('Erro na validação JWT:', 'Token inválido: Network error');
                expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
                expect(mockNext).not.toHaveBeenCalled();

                consoleErrorSpy.mockRestore();
            });
        });
    });

    describe('Given token extraction requirements', () => {
        beforeEach(() => {
            process.env.AWS_COGNITO_USER_POOL_ID = 'test-pool-id';
            process.env.AWS_COGNITO_CLIENT_ID = 'test-client-id';
            middleware = new JwtAuthMiddleware();
        });

        describe('When Bearer token has correct format', () => {
            it('Should extract token correctly', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
                };
                mockAccessVerifier.verify.mockResolvedValue({ sub: 'user-789' });

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockAccessVerifier.verify).toHaveBeenCalledWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
            });
        });

        describe('When Bearer token has extra spaces', () => {
            it('Should extract token correctly ignoring extra spaces', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer    token-with-spaces',
                };
                mockAccessVerifier.verify.mockResolvedValue({ sub: 'user-spaces' });

                await middleware.use(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

                expect(mockAccessVerifier.verify).toHaveBeenCalledWith('   token-with-spaces');
            });
        });
    });
});