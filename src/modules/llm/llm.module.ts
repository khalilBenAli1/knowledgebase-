import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLMService } from './llm.service';
import { OpenAIProvider } from './providers/openai.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    OpenAIProvider,
    {
      provide: 'LLM_PROVIDER',
      useExisting: OpenAIProvider,
    },
    LLMService,
  ],
  exports: [LLMService],
})
export class LLMModule {}
