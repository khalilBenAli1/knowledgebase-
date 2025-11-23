export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMGenerationOptions {
  conversationSummary?: string | null;
  conversationHistory?: ConversationMessage[];
  maxTokens?: number; // Override max tokens for specific tasks
}

export interface LLMProvider {
  generateAnswer(prompt: string, context: string[], options?: LLMGenerationOptions): Promise<string>;
  embed(text: string): Promise<number[]>;
  summarizeConversation(previousSummary: string | null, question: string, answer: string): Promise<string>;
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
