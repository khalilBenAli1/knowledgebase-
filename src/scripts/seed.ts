import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

config();

async function seed() {
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

    // Check if roles already exist
    const existingRoles = await queryRunner.query('SELECT COUNT(*) as count FROM roles');

    if (existingRoles[0].count > 0) {
      console.log('Roles already exist, skipping seed...');
      await queryRunner.release();
      await dataSource.destroy();
      return;
    }

    console.log('Creating roles...');

    // Insert roles
    const roleInsertResult = await queryRunner.query(`
      INSERT INTO roles (name, permissions, "createdAt")
      VALUES
        ('User', '{}', NOW()),
        ('HR Admin', '{}', NOW()),
        ('Legal Admin', '{}', NOW()),
        ('IT Admin', '{}', NOW())
      RETURNING id, name
    `);

    console.log('Roles created successfully');

    // Find IT Admin role ID
    const itAdminRole = roleInsertResult.find((r: any) => r.name === 'IT Admin');

    if (!itAdminRole) {
      throw new Error('IT Admin role not found');
    }

    // Hash password for admin user
    const passwordHash = await bcrypt.hash('admin123', 10);

    console.log('Creating admin user...');

    // Create admin user
    await queryRunner.query(`
      INSERT INTO users (name, email, "passwordHash", "roleId", "isActive", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, ['Admin User', 'admin@biat.com', passwordHash, itAdminRole.id, true]);

    console.log('Admin user created successfully');
    console.log('\n=================================');
    console.log('Seed completed successfully!');
    console.log('=================================');
    console.log('Login credentials:');
    console.log('  Email: admin@biat.com');
    console.log('  Password: admin123');
    console.log('=================================');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');

    await queryRunner.release();
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
