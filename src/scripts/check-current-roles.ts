import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function checkRoles() {
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

    console.log('\nCurrent roles in database:');
    console.log('=========================');

    const roles = await queryRunner.query(`SELECT id, name FROM roles ORDER BY name`);

    roles.forEach((role: any) => {
      console.log(`- ${role.name} (ID: ${role.id})`);
    });

    await queryRunner.release();
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Failed to check roles:', error);
    process.exit(1);
  }
}

checkRoles();
