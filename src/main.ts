import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Habilitar CORS para el frontend de Angular (puerto 4200)
  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validaciones globales de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Configuración de Swagger OpenAPI
  const config = new DocumentBuilder()
    .setTitle('CITEF API - Sistema de Laboratorios FCEE UAGRM')
    .setDescription(
      'Documentación interactiva Swagger para el Backend de CITEF. Incluye Módulo 1: Seguridad y Acceso (CU1 Gestión de usuarios, CU2 Restablecer contraseña, CU3 Gestión de roles y permisos, CU4 Bitácora de auditoría).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Ingrese el token JWT obtenido del endpoint /api/v1/auth/login',
        in: 'header',
      },
      'JWT-auth', // default security name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(
    ` Servidor CITEF Backend corriendo en: http://localhost:${port}/api/v1`,
  );
  logger.log(
    ` Documentación Swagger disponible en: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
