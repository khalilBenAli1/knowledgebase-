import { Inject, Injectable } from '@nestjs/common';
import { LLMProvider, LLMGenerationOptions } from './interfaces/llm-provider.interface';

@Injectable()
export class LLMService {
  constructor(
    @Inject('LLM_PROVIDER')
    private readonly llmProvider: LLMProvider,
  ) {}

  async generateAnswer(prompt: string, context: string[], options?: LLMGenerationOptions): Promise<string> {
    return this.llmProvider.generateAnswer(prompt, context, options);
  }

  async embed(text: string): Promise<number[]> {
    return this.llmProvider.embed(text);
  }

  async summarizeConversation(previousSummary: string | null, question: string, answer: string): Promise<string> {
    return this.llmProvider.summarizeConversation(previousSummary, question, answer);
  }
}
