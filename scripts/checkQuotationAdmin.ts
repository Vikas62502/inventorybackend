import bcrypt from 'bcryptjs';
import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'chairbord_solar',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false
  }
);

const checkAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    const username = 'admin';
    const password = 'admin123';

    // Check if admin exists
    const admin = await sequelize.query(
      'SELECT id, username, "isActive", "emailVerified", role, email FROM dealers WHERE username = :username',
      {
        replacements: { username },
        type: QueryTypes.SELECT
      }
    ) as any[];

    if (!admin || admin.length === 0) {
      console.log('❌ Admin user does not exist!');
      console.log('   Run: npx ts-node scripts/initQuotationAdmin.ts');
      return;
    }

    const adminData = admin[0];
    console.log('📋 Admin User Details:');
    console.log(`   ID: ${adminData.id}`);
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Role: ${adminData.role}`);
    console.log(`   Is Active: ${adminData.isActive}`);
    console.log(`   Email Verified: ${adminData.emailVerified}\n`);

    // Check password
    const adminWithPassword = await sequelize.query(
      'SELECT password FROM dealers WHERE username = :username',
      {
        replacements: { username },
        type: QueryTypes.SELECT
      }
    ) as any[];

    if (adminWithPassword && adminWithPassword.length > 0) {
      const hashedPassword = adminWithPassword[0].password;
      const isValid = await bcrypt.compare(password, hashedPassword);
      
      console.log('🔐 Password Check:');
      console.log(`   Expected password: ${password}`);
      console.log(`   Password matches: ${isValid ? '✅ YES' : '❌ NO'}\n`);

      if (!isValid) {
        console.log('⚠️  Password does not match!');
        console.log('   The password hash in database does not match "admin123"');
        console.log('   You may need to reset the password.\n');
      }
    }

    // Check if active
    if (!adminData.isActive) {
      console.log('⚠️  Admin account is NOT active!');
      console.log('   Activating admin account...\n');
      
      await sequelize.query(
        'UPDATE dealers SET "isActive" = true WHERE username = :username',
        {
          replacements: { username },
          type: QueryTypes.UPDATE
        }
      );
      
      console.log('✅ Admin account activated!\n');
    }

    // Check for required fields (new schema)
    const tableInfo = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'dealers' AND column_name = 'gender'`,
      { type: QueryTypes.SELECT }
    ) as any[];

    if (tableInfo && tableInfo.length > 0) {
      const adminFields = await sequelize.query(
        'SELECT gender, "dateOfBirth", "fatherName", "fatherContact", "governmentIdType", "governmentIdNumber", "addressStreet", "addressCity", "addressState", "addressPincode" FROM dealers WHERE username = :username',
        {
          replacements: { username },
          type: QueryTypes.SELECT
        }
      ) as any[];

      if (adminFields && adminFields.length > 0) {
        const fields = adminFields[0];
        console.log('📝 Required Fields Check:');
        console.log(`   Gender: ${fields.gender || '❌ MISSING'}`);
        console.log(`   Date of Birth: ${fields.dateOfBirth || '❌ MISSING'}`);
        console.log(`   Father Name: ${fields.fatherName || '❌ MISSING'}`);
        console.log(`   Father Contact: ${fields.fatherContact || '❌ MISSING'}`);
        console.log(`   Government ID Type: ${fields.governmentIdType || '❌ MISSING'}`);
        console.log(`   Government ID Number: ${fields.governmentIdNumber || '❌ MISSING'}`);
        console.log(`   Address Street: ${fields.addressStreet || '❌ MISSING'}`);
        console.log(`   Address City: ${fields.addressCity || '❌ MISSING'}`);
        console.log(`   Address State: ${fields.addressState || '❌ MISSING'}`);
        console.log(`   Address Pincode: ${fields.addressPincode || '❌ MISSING'}\n`);

        const missingFields = [];
        if (!fields.gender) missingFields.push('gender');
        if (!fields.dateOfBirth) missingFields.push('dateOfBirth');
        if (!fields.fatherName) missingFields.push('fatherName');
        if (!fields.fatherContact) missingFields.push('fatherContact');
        if (!fields.governmentIdType) missingFields.push('governmentIdType');
        if (!fields.governmentIdNumber) missingFields.push('governmentIdNumber');
        if (!fields.addressStreet) missingFields.push('addressStreet');
        if (!fields.addressCity) missingFields.push('addressCity');
        if (!fields.addressState) missingFields.push('addressState');
        if (!fields.addressPincode) missingFields.push('addressPincode');

        if (missingFields.length > 0) {
          console.log('⚠️  Missing required fields!');
          console.log(`   Missing: ${missingFields.join(', ')}`);
          console.log('   Run: npx ts-node scripts/initQuotationAdmin.ts (it will update existing admin)\n');
        } else {
          console.log('✅ All required fields are present!\n');
        }
      }
    }

    console.log('✅ Admin check completed!');
    console.log('\n💡 Login Credentials:');
    console.log(`   Endpoint: POST /api/auth/login`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error:', errorMessage);
  } finally {
    await sequelize.close();
  }
};

checkAdmin();


