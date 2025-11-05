import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('api/suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  /**
   * GET /api/suggestions/popular
   * Get the most popular questions across all users
   */
  @Get('popular')
  async getPopularQuestions(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.suggestionsService.getPopularQuestions(limitNum);
  }

  /**
   * GET /api/suggestions/related?q=query
   * Get related questions based on partial query
   */
  @Get('related')
  async getRelatedQuestions(
    @Query('q') query: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('userOnly') userOnly?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    const useUserOnly = userOnly === 'true';

    return this.suggestionsService.getRelatedQuestions(
      query,
      useUserOnly ? user.id : undefined,
      limitNum,
    );
  }

  /**
   * GET /api/suggestions/user
   * Get personalized suggestions based on user's history
   */
  @Get('user')
  async getUserSuggestions(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.suggestionsService.getUserSuggestions(user.id, limitNum);
  }

  /**
   * GET /api/suggestions/topic?topic=congé
   * Get suggestions for a specific topic
   */
  @Get('topic')
  async getTopicSuggestions(
    @Query('topic') topic: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.suggestionsService.getTopicSuggestions(topic, limitNum);
  }
}
