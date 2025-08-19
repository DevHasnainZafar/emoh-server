import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConst } from './constants/Endpoints';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://admin-dev.emohpay.com',
      'https://admin-stg.emohpay.com',
      'https://emohpay.com',
      'https://admin.emohpay.com',
      '*',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, auth-token',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  const prismaService = app.get(PrismaService);
  try {
    await prismaService.$connect();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
  const config = new DocumentBuilder()
    .setTitle('EMOH API')
    .setDescription('DB API for EMOH App')
    .setVersion('1.0')
    .addBearerAuth({
      description: `[just text field] Please enter token in following format: Bearer <JWT>`,
      name: 'Authorization',
      bearerFormat: 'Bearer',
      scheme: 'Bearer',
      type: 'http',
      in: 'Header',
    })
    .addApiKey(
      {
        type: 'apiKey',
        name: 'auth-token',
        in: 'header',
      },
      'auth-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(AppConst.SWAGGER_URL, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  await app.listen(3000);
}
bootstrap();
