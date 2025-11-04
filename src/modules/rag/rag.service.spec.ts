import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagService } from './rag.service';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { Document } from '../../entities/document.entity';
import { LLMService } from '../llm/llm.service';
import { ConfigService } from '@nestjs/config';

describe('RagService', () => {
  let service: RagService;
  let chunksRepository: jest.Mocked<Repository<DocumentChunk>>;
  let documentsRepository: jest.Mocked<Repository<Document>>;
  let llmService: jest.Mocked<LLMService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: getRepositoryToken(DocumentChunk),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: LLMService,
          useValue: {
            embed: jest.fn(),
            generateAnswer: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    chunksRepository = module.get(getRepositoryToken(DocumentChunk));
    documentsRepository = module.get(getRepositoryToken(Document));
    llmService = module.get(LLMService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('retrieveContext', () => {
    it('should retrieve relevant chunks and sources', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockChunks = [
        {
          id: 'chunk1',
          chunkText: 'Sample text 1',
          document: {
            id: 'doc1',
            name: 'Document 1',
          },
          page: 1,
          articleRef: 'Art. 1',
        },
      ];

      llmService.embed.mockResolvedValue(mockEmbedding);

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockChunks),
      };

      chunksRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.retrieveContext('test query');

      expect(result.context).toHaveLength(1);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].documentName).toBe('Document 1');
      expect(llmService.embed).toHaveBeenCalledWith('test query');
    });
  });
});
