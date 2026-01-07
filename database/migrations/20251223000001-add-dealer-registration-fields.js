'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new fields to dealers table
    await queryInterface.addColumn('dealers', 'gender', {
      type: Sequelize.ENUM('Male', 'Female', 'Other'),
      allowNull: true // Allow null initially for existing records
    });

    await queryInterface.addColumn('dealers', 'dateOfBirth', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'fatherName', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'fatherContact', {
      type: Sequelize.STRING(15),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'governmentIdType', {
      type: Sequelize.ENUM('Aadhaar Card', 'PAN Card', 'Voter ID', 'Driving License', 'Passport'),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'governmentIdNumber', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'governmentIdImage', {
      type: Sequelize.STRING(500),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'addressStreet', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'addressCity', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'addressState', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'addressPincode', {
      type: Sequelize.STRING(10),
      allowNull: true
    });

    await queryInterface.addColumn('dealers', 'emailVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Update isActive default to false for new records
    await queryInterface.changeColumn('dealers', 'isActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Add unique index on mobile (PostgreSQL syntax)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_dealer_mobile 
      ON dealers (mobile) 
      WHERE mobile IS NOT NULL;
    `);

    // Add index on isActive
    await queryInterface.addIndex('dealers', ['isActive'], {
      name: 'idx_dealer_isActive'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('dealers', 'idx_dealer_isActive');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_dealer_mobile;');

    // Remove columns
    await queryInterface.removeColumn('dealers', 'emailVerified');
    await queryInterface.removeColumn('dealers', 'addressPincode');
    await queryInterface.removeColumn('dealers', 'addressState');
    await queryInterface.removeColumn('dealers', 'addressCity');
    await queryInterface.removeColumn('dealers', 'addressStreet');
    await queryInterface.removeColumn('dealers', 'governmentIdImage');
    await queryInterface.removeColumn('dealers', 'governmentIdNumber');
    await queryInterface.removeColumn('dealers', 'governmentIdType');
    await queryInterface.removeColumn('dealers', 'fatherContact');
    await queryInterface.removeColumn('dealers', 'fatherName');
    await queryInterface.removeColumn('dealers', 'dateOfBirth');
    await queryInterface.removeColumn('dealers', 'gender');

    // Revert isActive default
    await queryInterface.changeColumn('dealers', 'isActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });
  }
};

