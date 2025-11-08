import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleName } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { DocumentStatus } from '../../entities/document.entity';

@Controller('api/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles(RoleName.HR_ADMIN, RoleName.HR_ADMIN, RoleName.IT_ADMIN, RoleName.USER)
  findAll(
    @Query('status') status?: DocumentStatus,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
  ) {
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (category) {
      filters.category = category;
    }

    if (tags) {
      filters.tags = tags.split(',');
    }

    return this.documentsService.findAll(filters);
  }

  @Get(':id')
  @Roles(RoleName.HR_ADMIN, RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  findOne(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Get(':id/chunks')
  @Roles(RoleName.HR_ADMIN, RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  getChunks(@Param('id') id: string) {
    return this.documentsService.getChunks(id);
  }

  @Get(':id/download')
  @Roles(RoleName.HR_ADMIN, RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  async downloadDocument(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const document = await this.documentsService.findById(id);

    const file = createReadStream(document.filePath);
    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.originalFilename}"`,
    });

    return new StreamableFile(file);
  }

  @Post('upload')
  @Roles(RoleName.HR_ADMIN, RoleName.HR_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'application/pdf' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF and DOCX files are allowed'), false);
        }
      },
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const document = await this.documentsService.create({
      name: file.originalname.replace(extname(file.originalname), ''),
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      uploaderId: user.id,
      filePath: file.path,
      status: DocumentStatus.UPLOADED,
    });

    return document;
  }

  @Post(':id/approve')
  @Roles(RoleName.HR_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.approve(id, user.id);
  }

  @Post(':id/publish')
  @Roles(RoleName.HR_ADMIN)
  publish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.publish(id, user.id);
  }

  @Post(':id/unpublish')
  @Roles(RoleName.HR_ADMIN)
  unpublish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.unpublish(id, user.id);
  }

  @Delete(':id')
  @Roles(RoleName.HR_ADMIN)
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.delete(id, user.id);
  }
}
