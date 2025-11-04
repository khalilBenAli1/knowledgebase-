import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLMService } from './llm.service';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    OllamaProvider,
    {
      provide: 'LLM_PROVIDER',
      useClass: OllamaProvider,
    },
    LLMService,
  ],
  exports: [LLMService],
})
export class LLMModule {}
