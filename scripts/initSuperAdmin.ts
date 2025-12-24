import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models';
import sequelize from '../config/database';
import logger from '../config/logger';

/**
 * Initialize superadmin user
 * Creates a superadmin user with username "superadmin" and password "admin123"
 * if it doesn't already exist
 */
const initSuperAdmin = async (): Promise<void> => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established for superadmin initialization');

    const username = 'superadmin';
    const password = 'admin123';
    const name = 'Super Admin';
    const role = 'super-admin' as const;

    // Check if superadmin already exists
    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      logger.info('Superadmin user already exists', { username });
      console.log('✅ Superadmin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique ID for the superadmin
    const id = uuidv4();

    // Create superadmin user
    await User.create({
      id,
      username,
      password: hashedPassword,
      name,
      role,
      is_active: true,
      created_by_id: null,
      created_by_name: null
    });

    logger.info('Superadmin user created successfully', { username, id });
    console.log('✅ Superadmin user created successfully');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${role}`);
    console.log(`   ID: ${id}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error initializing superadmin', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('❌ Error initializing superadmin:', errorMessage);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run the script
initSuperAdmin();

