import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransfersModule } from './modules/transfers/transfers.module';
import { NodeListener } from './infrastructure/blockchain/node.listener.service';
import { DatabaseModule } from './shared/db/database.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './modules/auth/auth.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
      }),
    ConfigModule.forRoot({ isGlobal: true }),
    TransfersModule,
    DatabaseModule
  ],
  controllers: [],
  providers: [
    {provide: APP_GUARD, useClass: AuthGuard},
    NodeListener
  ],
})

export class AppModule {}
