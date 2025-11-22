import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddChatSessionSummary1715200000000 implements MigrationInterface {
  name = 'AddChatSessionSummary1715200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'chat_sessions',
      new TableColumn({
        name: 'contextSummary',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('chat_sessions', 'contextSummary');
  }
}
