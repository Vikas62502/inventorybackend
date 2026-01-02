import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../config/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

// Create sequelize instance for this script
const shouldUseSSL = (process.env.DB_SSL || '').toLowerCase() === 'true';
const allowUnauthorized =
  (process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'chairbord_solar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    dialectOptions: shouldUseSSL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: allowUnauthorized
          }
        }
      : {}
  }
);

/**
 * Run database migrations
 */
const runMigrations = async (): Promise<void> => {
  try {
    console.log('🔄 Running database migrations...');
    const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate');
    
    if (stderr && !stderr.includes('No migrations were executed')) {
      console.warn('Migration warnings:', stderr);
    }
    
    if (stdout) {
      console.log(stdout);
    }
    
    console.log('✅ Migrations completed successfully');
  } catch (error: any) {
    // If migrations fail, check if it's because tables already exist
    if (error.message && error.message.includes('already exists')) {
      console.log('⚠️  Some tables already exist, continuing...');
    } else {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  }
};

/**
 * Initialize admin user for quotation system
 * Creates an admin user with username "admin" and password "admin123"
 * if it doesn't already exist
 */
const initQuotationAdmin = async (): Promise<void> => {
  try {
    // Test database connection first
    await sequelize.authenticate();
    logger.info('Database connection established for admin initialization');
    console.log('✅ Database connection established');

    const username = 'admin';
    const password = 'admin123';
    const firstName = 'Admin';
    const lastName = 'User';
    const email = 'admin@chairbord.com';
    const mobile = '9876543210';
    const role = 'admin';
    const gender = 'Male';
    const dateOfBirth = '1990-01-01'; // Default date (over 18 years old)
    const fatherName = 'Admin Father';
    const fatherContact = '9876543211';
    const governmentIdType = 'PAN Card';
    const governmentIdNumber = 'ABCDE1234F';
    const addressStreet = 'Admin Office';
    const addressCity = 'Mumbai';
    const addressState = 'Maharashtra';
    const addressPincode = '400001';

    // Check if admin already exists using raw SQL
    const existingAdmins = await sequelize.query(
      'SELECT id, username, role FROM dealers WHERE username = :username',
      {
        replacements: { username },
        type: QueryTypes.SELECT
      }
    ) as any[];

    if (existingAdmins && existingAdmins.length > 0) {
      const existing = existingAdmins[0];
      logger.info('Admin user already exists', { username });
      console.log('✅ Admin user already exists');
      console.log(`   Username: ${username}`);
      console.log(`   Role: ${existing.role || role}`);
      
      // Hash password to verify/update
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Check if admin is active, if not, activate it and update password
      const adminDetails = await sequelize.query(
        'SELECT "isActive", password FROM dealers WHERE username = :username',
        {
          replacements: { username },
          type: QueryTypes.SELECT
        }
      ) as any[];
      
      let needsUpdate = false;
      const updateFields: string[] = [];
      
      if (adminDetails && adminDetails.length > 0) {
        if (!adminDetails[0].isActive) {
          updateFields.push('"isActive" = true');
          needsUpdate = true;
          console.log('   ⚠️  Admin account is inactive - will activate');
        }
        
        // Always update password to ensure it matches
        updateFields.push('password = :password');
        needsUpdate = true;
        console.log('   ⚠️  Updating password to ensure it matches');
      }
      
      if (needsUpdate) {
        await sequelize.query(
          `UPDATE dealers SET ${updateFields.join(', ')}, "updatedAt" = NOW() WHERE username = :username`,
          {
            replacements: { username, password: hashedPassword },
            type: QueryTypes.UPDATE
          }
        );
        console.log('   ✅ Admin account updated');
      }
      
      console.log(`   ✅ Ready to login with username: ${username} and password: ${password}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique ID for the admin
    const id = `dealer_${uuidv4()}`;

    // Check if new required fields exist in the table
    const tableInfo = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'dealers' AND column_name = 'gender'`,
      { type: QueryTypes.SELECT }
    ) as any[];

    // Create admin user using raw SQL
    if (tableInfo && tableInfo.length > 0) {
      // New schema with all required fields
      await sequelize.query(
        `INSERT INTO dealers (
          id, username, password, "firstName", "lastName", email, mobile, 
          gender, "dateOfBirth", "fatherName", "fatherContact", 
          "governmentIdType", "governmentIdNumber",
          "addressStreet", "addressCity", "addressState", "addressPincode",
          role, "isActive", "emailVerified", "createdAt", "updatedAt"
        )
        VALUES (
          :id, :username, :password, :firstName, :lastName, :email, :mobile,
          :gender::enum_dealers_gender, :dateOfBirth, :fatherName, :fatherContact,
          :governmentIdType::enum_dealers_governmentidtype, :governmentIdNumber,
          :addressStreet, :addressCity, :addressState, :addressPincode,
          :role::enum_dealers_role, true, false, NOW(), NOW()
        )`,
        {
          replacements: {
            id,
            username,
            password: hashedPassword,
            firstName,
            lastName,
            email,
            mobile,
            gender,
            dateOfBirth,
            fatherName,
            fatherContact,
            governmentIdType,
            governmentIdNumber,
            addressStreet,
            addressCity,
            addressState,
            addressPincode,
            role
          },
          type: QueryTypes.INSERT
        }
      );
    } else {
      // Old schema without new fields (backward compatibility)
      await sequelize.query(
        `INSERT INTO dealers (id, username, password, "firstName", "lastName", email, mobile, role, "isActive", "createdAt", "updatedAt")
         VALUES (:id, :username, :password, :firstName, :lastName, :email, :mobile, :role::enum_dealers_role, true, NOW(), NOW())`,
        {
          replacements: {
            id,
            username,
            password: hashedPassword,
            firstName,
            lastName,
            email,
            mobile,
            role
          },
          type: QueryTypes.INSERT
        }
      );
    }

    logger.info('Admin user created successfully', { username, id });
    console.log('✅ Admin user created successfully');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: ${role}`);
    console.log(`   Email: ${email}`);
    console.log(`   ID: ${id}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error initializing admin', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('❌ Error initializing admin:', errorMessage);
    throw error;
  }
};

/**
 * Main function to run migrations and create admin
 */
const main = async (): Promise<void> => {
  try {
    // Step 1: Run migrations
    await runMigrations();

    // Step 2: Create admin user
    await initQuotationAdmin();

    console.log('\n✅ Setup completed successfully!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('\n❌ Setup failed:', errorMessage);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run the script
main();
