export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  generateAnswer(prompt: string, context: string[], conversationHistory?: ConversationMessage[]): Promise<string>;
  embed(text: string): Promise<number[]>;
}

export interface LLMConfig {
  provider: string;
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  numThreads?: number;
  numGpu?: number;
  numCtx?: number;
}
