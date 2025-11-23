import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FormationsService } from './formations.service';
import { FormationsCatalogService } from './formations-catalog.service';
import { Formation } from '../../entities/formation.entity';
import { RoleName } from '../../entities/role.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('api/formations')
@UseGuards(JwtAuthGuard)
export class FormationsController {
  private readonly logger = new Logger(FormationsController.name);

  constructor(
    private readonly formationsService: FormationsService,
    private readonly catalogService: FormationsCatalogService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  async create(
    @Body() createData: { title: string; description: string; startDate: Date; endDate?: Date; imageUrl?: string },
    @Request() req,
  ): Promise<Formation> {
    return this.formationsService.create(createData, req.user);
  }

  @Get()
  async findAll(@Query('published') published?: string): Promise<Formation[]> {
    const isPublished = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.formationsService.findAll(isPublished);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Formation> {
    return this.formationsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<Formation>,
    @Request() req,
  ): Promise<Formation> {
    return this.formationsService.update(id, updateData, req.user);
  }

  @Put(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  async publish(@Param('id') id: string, @Request() req): Promise<Formation> {
    return this.formationsService.publish(id, req.user);
  }

  @Put(':id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  async unpublish(@Param('id') id: string, @Request() req): Promise<Formation> {
    return this.formationsService.unpublish(id, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  async remove(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    await this.formationsService.remove(id, req.user);
    return { message: 'Formation deleted successfully' };
  }

  // NEW: Catalog OCR endpoints
  @Post('catalog/upload')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/catalogs',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed for catalog upload'), false);
        }
      },
    }),
  )
  async uploadCatalog(@UploadedFile() file: Express.Multer.File, @Request() req) {
    const result = await this.catalogService.extractAndImport(file.path, req.user.id);
    return {
      message: 'Catalog processed successfully',
      ...result,
    };
  }

  @Post('catalog/import-extracted')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  async importExtracted(@Body() body: { formations: any[] }, @Request() req) {
    try {
      const imported = await this.catalogService.importFormations(body.formations, req.user.id);
      return {
        message: 'Formations imported successfully',
        imported: imported.length,
        formations: imported,
      };
    } catch (error) {
      this.logger.error('Failed to import formations', error);
      throw new BadRequestException(`Failed to import formations: ${error.message}`);
    }
  }

  @Post('catalog/extract-preview')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/catalogs',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `preview-${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed for catalog upload'), false);
        }
      },
    }),
  )
  async extractPreview(@UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      const extracted = await this.catalogService.extractFormationsFromPDF(file.path, req.user.id);

      // Clean up uploaded file after processing
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        count: extracted.length,
        formations: extracted,
      };
    } catch (error) {
      // Clean up file on error
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      this.logger.error('Failed to extract formations from catalog', error);
      throw new BadRequestException(`Failed to extract formations: ${error.message}`);
    }
  }
}
