import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class ImportFormationsDto {
  @IsUUID()
  documentId: string;

  @IsBoolean()
  @IsOptional()
  autoPublish?: boolean = false;
}
