import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { ActualitiesModule } from './modules/actualities/actualities.module';
import { FormationsModule } from './modules/formations/formations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: false,
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          rootPath: join(__dirname, '..', configService.get('FRONTEND_BUILD_PATH', 'frontend/dist')),
          exclude: ['/api*'],
        },
      ],
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    DocumentsModule,
    IngestionModule,
    RagModule,
    ChatModule,
    FeedbackModule,
    AuditModule,
    AdminModule,
    HealthModule,
    OcrModule,
    SuggestionsModule,
    ActualitiesModule,
    FormationsModule,
  ],
})
export class AppModule {}
