import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error({ err: error, url: request.url, method: request.method });

  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      status: 'error',
      errorCode: error.errorCode,
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    reply.status(400).send({
      status: 'error',
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: 'Dados inválidos',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  reply.status(500).send({
    status: 'error',
    errorCode: ErrorCode.INTERNAL_ERROR,
    message: 'Erro interno do servidor',
  });
}
