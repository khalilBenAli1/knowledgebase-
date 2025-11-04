export interface LLMProvider {
  generateAnswer(prompt: string, context: string[]): Promise<string>;
  embed(text: string): Promise<number[]>;
}

export interface LLMConfig {
  provider: string;
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}
