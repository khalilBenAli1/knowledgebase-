import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function updateRoles() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/entities/*.entity.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    const queryRunner = dataSource.createQueryRunner();

    console.log('Updating role names...');

    // Update role names to French
    await queryRunner.query(`
      UPDATE roles SET name = 'Collaborateur' WHERE name = 'User';
    `);

    await queryRunner.query(`
      UPDATE roles SET name = 'Gestionnaire RH' WHERE name = 'HR Admin';
    `);

    await queryRunner.query(`
      UPDATE roles SET name = 'Responsable RH' WHERE name = 'Legal Admin';
    `);

    console.log('Role names updated successfully!');
    console.log('Updated roles:');
    console.log('  User -> Collaborateur');
    console.log('  HR Admin -> Gestionnaire RH');
    console.log('  Legal Admin -> Responsable RH');
    console.log('  IT Admin -> IT Admin (unchanged)');

    await queryRunner.release();
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

updateRoles();
