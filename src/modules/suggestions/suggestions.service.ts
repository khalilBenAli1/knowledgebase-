import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, MessageRole } from '../../entities/chat-message.entity';

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private messagesRepository: Repository<ChatMessage>,
  ) {}

  /**
   * Get popular questions asked by users
   */
  async getPopularQuestions(limit: number = 5): Promise<string[]> {
    try {
      // Get most frequently asked questions (user messages)
      const result = await this.messagesRepository
        .createQueryBuilder('message')
        .select('message.content', 'content')
        .addSelect('COUNT(*)', 'count')
        .where('message.role = :role', { role: MessageRole.USER })
        .andWhere('LENGTH(message.content) > 10') // Filter out very short queries
        .groupBy('message.content')
        .orderBy('count', 'DESC')
        .limit(limit)
        .getRawMany();

      return result.map((r) => r.content);
    } catch (error) {
      this.logger.error('Error fetching popular questions', error);
      return this.getFallbackQuestions();
    }
  }

  /**
   * Get related questions based on a partial query
   */
  async getRelatedQuestions(
    query: string,
    userId?: string,
    limit: number = 5,
  ): Promise<string[]> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      const queryBuilder = this.messagesRepository
        .createQueryBuilder('message')
        .select('DISTINCT message.content', 'content')
        .where('message.role = :role', { role: MessageRole.USER })
        .andWhere('message.content ILIKE :query', { query: `%${query}%` })
        .andWhere('LENGTH(message.content) > 10')
        .orderBy('message.createdAt', 'DESC')
        .limit(limit);

      // Optionally filter by user's own history
      if (userId) {
        queryBuilder.leftJoin('message.session', 'session');
        queryBuilder.andWhere('session.userId = :userId', { userId });
      }

      const result = await queryBuilder.getRawMany();
      return result.map((r) => r.content);
    } catch (error) {
      this.logger.error('Error fetching related questions', error);
      return [];
    }
  }

  /**
   * Get suggestions for a specific user based on their history
   */
  async getUserSuggestions(userId: string, limit: number = 5): Promise<string[]> {
    try {
      const result = await this.messagesRepository
        .createQueryBuilder('message')
        .leftJoin('message.session', 'session')
        .select('message.content', 'content')
        .where('session.userId = :userId', { userId })
        .andWhere('message.role = :role', { role: MessageRole.USER })
        .andWhere('LENGTH(message.content) > 10')
        .orderBy('message.createdAt', 'DESC')
        .limit(limit * 2) // Get more to ensure variety
        .getRawMany();

      // Remove duplicates and return
      const uniqueQuestions = [...new Set(result.map((r) => r.content))];
      return uniqueQuestions.slice(0, limit);
    } catch (error) {
      this.logger.error('Error fetching user suggestions', error);
      return this.getFallbackQuestions();
    }
  }

  /**
   * Get topic-based suggestions
   */
  async getTopicSuggestions(topic: string, limit: number = 5): Promise<string[]> {
    try {
      const keywords = this.getTopicKeywords(topic);

      const result = await this.messagesRepository
        .createQueryBuilder('message')
        .select('DISTINCT message.content', 'content')
        .where('message.role = :role', { role: MessageRole.USER })
        .andWhere(
          '(' +
            keywords.map((_, idx) => `message.content ILIKE :keyword${idx}`).join(' OR ') +
            ')',
          keywords.reduce((acc, keyword, idx) => {
            acc[`keyword${idx}`] = `%${keyword}%`;
            return acc;
          }, {}),
        )
        .andWhere('LENGTH(message.content) > 10')
        .orderBy('message.createdAt', 'DESC')
        .limit(limit)
        .getRawMany();

      return result.map((r) => r.content);
    } catch (error) {
      this.logger.error('Error fetching topic suggestions', error);
      return [];
    }
  }

  /**
   * Get fallback questions when database is empty or errors occur
   */
  private getFallbackQuestions(): string[] {
    return [
      'Quels sont les jours fériés officiels?',
      'Comment demander un congé annuel?',
      'Quelle est la politique de télétravail?',
      'Comment fonctionne le système de remboursement des frais?',
      'Quels sont les horaires de travail?',
    ];
  }

  /**
   * Map topics to search keywords
   */
  private getTopicKeywords(topic: string): string[] {
    const topicMap: Record<string, string[]> = {
      congé: ['congé', 'vacances', 'absence', 'permission'],
      salaire: ['salaire', 'rémunération', 'paie', 'prime'],
      horaire: ['horaire', 'temps', 'travail', 'heures'],
      formation: ['formation', 'apprentissage', 'développement'],
      assurance: ['assurance', 'couverture', 'santé', 'médicale'],
      télétravail: ['télétravail', 'remote', 'distance', 'home office'],
      règlement: ['règlement', 'politique', 'procédure', 'directive'],
    };

    const lowerTopic = topic.toLowerCase();
    for (const [key, keywords] of Object.entries(topicMap)) {
      if (lowerTopic.includes(key)) {
        return keywords;
      }
    }

    return [topic];
  }
}
