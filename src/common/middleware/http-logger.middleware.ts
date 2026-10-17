import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('CITEF_HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const inicio = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duracion = Date.now() - inicio;
      const { statusCode } = res;

      let nivel: 'log' | 'warn' | 'error' = 'log';
      if (statusCode >= 500) {
        nivel = 'error';
      } else if (statusCode >= 400) {
        nivel = 'warn';
      }

      const mensaje = `[${method}] ${originalUrl} -> ${statusCode} (${duracion}ms) - IP: ${ip || req.socket.remoteAddress}`;
      this.logger[nivel](mensaje);
    });

    next();
  }
}
