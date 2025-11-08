import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHRFieldsToFormationRequest1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add MANAGER_APPROVED status to enum
    await queryRunner.query(`
      ALTER TYPE "FormationRequestStatus" ADD VALUE IF NOT EXISTS 'manager_approved';
    `);

    // Add HR review fields
    await queryRunner.query(`
      ALTER TABLE "formation_requests"
      ADD COLUMN IF NOT EXISTS "hrResponse" text,
      ADD COLUMN IF NOT EXISTS "hrReviewedBy" uuid,
      ADD COLUMN IF NOT EXISTS "hrReviewedAt" timestamp;
    `);

    // Add foreign key constraint for hrReviewedBy
    await queryRunner.query(`
      ALTER TABLE "formation_requests"
      ADD CONSTRAINT "FK_formation_requests_hrReviewedBy"
      FOREIGN KEY ("hrReviewedBy") REFERENCES "users"("id")
      ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "formation_requests"
      DROP CONSTRAINT IF EXISTS "FK_formation_requests_hrReviewedBy";
    `);

    // Drop HR review fields
    await queryRunner.query(`
      ALTER TABLE "formation_requests"
      DROP COLUMN IF EXISTS "hrResponse",
      DROP COLUMN IF EXISTS "hrReviewedBy",
      DROP COLUMN IF EXISTS "hrReviewedAt";
    `);

    // Note: Cannot remove enum value in PostgreSQL without recreating the enum
    // This would require a more complex migration
  }
}
