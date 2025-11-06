import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LLMService } from './llm.service';
import { OllamaProvider } from './providers/ollama.provider';
import { GroqProvider } from './providers/groq.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    OllamaProvider,
    GroqProvider,
    {
      provide: 'LLM_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('LLM_PROVIDER', 'ollama');
        if (provider === 'groq') {
          return new GroqProvider(configService);
        }
        return new OllamaProvider(configService);
      },
      inject: [ConfigService],
    },
    LLMService,
  ],
  exports: [LLMService],
})
export class LLMModule {}
