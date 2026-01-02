const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

const shouldUseSSL = (process.env.DB_SSL || '').toLowerCase() === 'true';
const allowUnauthorized = (process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false';

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

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    console.log('Running migration: Make locationLink nullable in visits table...');
    
    const migrationSQL = `
      -- Make locationLink nullable
      ALTER TABLE visits 
      ALTER COLUMN "locationLink" DROP NOT NULL;
    `;
    
    console.log('   - Executing migration SQL...');
    await sequelize.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Made locationLink nullable in visits table');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    console.error('\nTroubleshooting:');
    console.error('   1. Check your .env file has correct DB credentials');
    console.error('   2. If using remote database, set DB_SSL=true in .env');
    console.error('   3. Ensure database user has ALTER TABLE permissions');
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

runMigration();

