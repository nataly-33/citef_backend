import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../modules/seed/seed.service';

async function run() {
  console.log('--- INICIANDO SEEDER MANUAL DE CITEF ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);
  await seedService.onApplicationBootstrap();
  await app.close();
  console.log('--- SEEDER EJECUTADO EXITOSAMENTE ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error al ejecutar el seeder:', err);
  process.exit(1);
});
