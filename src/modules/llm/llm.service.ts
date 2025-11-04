import { Inject, Injectable } from '@nestjs/common';
import { LLMProvider } from './interfaces/llm-provider.interface';

@Injectable()
export class LLMService {
  constructor(
    @Inject('LLM_PROVIDER')
    private readonly llmProvider: LLMProvider,
  ) {}

  async generateAnswer(prompt: string, context: string[]): Promise<string> {
    return this.llmProvider.generateAnswer(prompt, context);
  }

  async embed(text: string): Promise<number[]> {
    return this.llmProvider.embed(text);
  }
}
