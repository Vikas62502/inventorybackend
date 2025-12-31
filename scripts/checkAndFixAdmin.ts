import bcrypt from 'bcryptjs';
import { Dealer, Visitor } from '../models/index-quotation';
import { User } from '../models';
import sequelize from '../config/database';
import logger from '../config/logger';

/**
 * Check and fix admin accounts
 * This script checks if admin accounts exist and creates/fixes them if needed
 */
const checkAndFixAdmin = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');
    console.log('✅ Database connection established\n');

    // Check Quotation System Admin (Dealer with role='admin')
    console.log('🔍 Checking Quotation System Admin (Dealer)...');
    const adminDealer = await Dealer.findOne({ where: { username: 'admin' } });
    
    if (adminDealer) {
      console.log('   ✓ Admin dealer exists');
      console.log(`   Username: ${adminDealer.username}`);
      console.log(`   Role: ${adminDealer.role}`);
      console.log(`   IsActive: ${adminDealer.isActive}`);
      
      // Test password
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, adminDealer.password);
      console.log(`   Password (admin123) valid: ${isValid ? '✓' : '✗'}`);
      
      if (!adminDealer.isActive) {
        console.log('   ⚠️  Account is INACTIVE - activating now...');
        await adminDealer.update({ isActive: true });
        console.log('   ✅ Account activated');
      }
      
      if (!isValid) {
        console.log('   ⚠️  Password mismatch - resetting to admin123...');
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        await adminDealer.update({ password: hashedPassword });
        console.log('   ✅ Password reset to admin123');
      }
    } else {
      console.log('   ✗ Admin dealer does NOT exist');
      console.log('   Run: npm run init:quotation');
    }

    console.log('\n🔍 Checking Inventory System Super Admin (User)...');
    const superAdmin = await User.findOne({ where: { username: 'superadmin' } });
    
    if (superAdmin) {
      console.log('   ✓ Super admin exists');
      console.log(`   Username: ${superAdmin.username}`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log(`   IsActive: ${superAdmin.is_active}`);
      
      // Test password
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, superAdmin.password);
      console.log(`   Password (admin123) valid: ${isValid ? '✓' : '✗'}`);
      
      if (!superAdmin.is_active) {
        console.log('   ⚠️  Account is INACTIVE - activating now...');
        await superAdmin.update({ is_active: true });
        console.log('   ✅ Account activated');
      }
      
      if (!isValid) {
        console.log('   ⚠️  Password mismatch - resetting to admin123...');
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        await superAdmin.update({ password: hashedPassword });
        console.log('   ✅ Password reset to admin123');
      }
    } else {
      console.log('   ✗ Super admin does NOT exist');
      console.log('   Run: npm run init:superadmin');
    }

    console.log('\n📋 Summary:');
    console.log('   Quotation System Admin:');
    console.log('     Endpoint: POST /api/auth/login');
    console.log('     Username: admin');
    console.log('     Password: admin123');
    console.log('     Note: Uses quotationAuthRoutes (loaded second)');
    console.log('\n   Inventory System Super Admin:');
    console.log('     Endpoint: POST /api/auth/login (but overridden by quotation routes)');
    console.log('     Username: superadmin');
    console.log('     Password: admin123');
    console.log('     Note: This route is overridden by quotationAuthRoutes!');

    console.log('\n⚠️  IMPORTANT: Both auth routes use /api/auth/login');
    console.log('   The quotationAuthRoutes (line 85) overrides authRoutes (line 74)');
    console.log('   So /api/auth/login only works for Dealers and Visitors, not Users!');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error checking admin accounts', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('❌ Error:', errorMessage);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

checkAndFixAdmin();

