import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTables1731130000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create events table
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "eventDate" TIMESTAMP NOT NULL,
        "location" character varying,
        "imageUrl" character varying,
        "published" boolean NOT NULL DEFAULT false,
        "publishedAt" TIMESTAMP,
        "createdById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events" PRIMARY KEY ("id")
      )
    `);

    // Create event_form_fields table
    await queryRunner.query(`
      CREATE TYPE "event_form_field_fieldtype_enum" AS ENUM('text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'email', 'phone')
    `);

    await queryRunner.query(`
      CREATE TABLE "event_form_fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "label" character varying NOT NULL,
        "fieldType" "event_form_field_fieldtype_enum" NOT NULL DEFAULT 'text',
        "required" boolean NOT NULL DEFAULT false,
        "options" text,
        "placeholder" character varying,
        "order" integer NOT NULL DEFAULT 0,
        "eventId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_form_fields" PRIMARY KEY ("id")
      )
    `);

    // Create event_registrations table
    await queryRunner.query(`
      CREATE TYPE "event_registration_status_enum" AS ENUM('interested', 'going', 'not_going')
    `);

    await queryRunner.query(`
      CREATE TABLE "event_registrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" "event_registration_status_enum" NOT NULL DEFAULT 'interested',
        "eventId" uuid,
        "userId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_registrations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_user" UNIQUE ("eventId", "userId")
      )
    `);

    // Create event_registration_responses table
    await queryRunner.query(`
      CREATE TABLE "event_registration_responses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "answer" text NOT NULL,
        "registrationId" uuid,
        "formFieldId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_registration_responses" PRIMARY KEY ("id")
      )
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD CONSTRAINT "FK_events_createdBy"
      FOREIGN KEY ("createdById")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "event_form_fields"
      ADD CONSTRAINT "FK_event_form_fields_event"
      FOREIGN KEY ("eventId")
      REFERENCES "events"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "event_registrations"
      ADD CONSTRAINT "FK_event_registrations_event"
      FOREIGN KEY ("eventId")
      REFERENCES "events"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "event_registrations"
      ADD CONSTRAINT "FK_event_registrations_user"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "event_registration_responses"
      ADD CONSTRAINT "FK_event_registration_responses_registration"
      FOREIGN KEY ("registrationId")
      REFERENCES "event_registrations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "event_registration_responses"
      ADD CONSTRAINT "FK_event_registration_responses_formField"
      FOREIGN KEY ("formFieldId")
      REFERENCES "event_form_fields"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_registration_responses"`);
    await queryRunner.query(`DROP TABLE "event_registrations"`);
    await queryRunner.query(`DROP TYPE "event_registration_status_enum"`);
    await queryRunner.query(`DROP TABLE "event_form_fields"`);
    await queryRunner.query(`DROP TYPE "event_form_field_fieldtype_enum"`);
    await queryRunner.query(`DROP TABLE "events"`);
  }
}
