import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Render env values sometimes carry stray newlines / zero-width chars from copy-paste,
  // which Node refuses to write into the Access-Control-Allow-Origin header (ERR_INVALID_CHAR).
  // trim() only cleans the edges; strip everything outside printable ASCII instead —
  // a valid origin URL only ever uses that range.
  const corsOrigin =
    process.env.FRONTEND_URL?.replace(/[^\x21-\x7E]/g, '') || 'http://localhost:5173';
  // TODO: remove once the Render env var is confirmed clean.
  console.log('[bootstrap] FRONTEND_URL raw=%j -> origin=%j', process.env.FRONTEND_URL, corsOrigin);
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
