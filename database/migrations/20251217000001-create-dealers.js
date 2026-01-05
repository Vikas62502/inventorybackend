'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dealers', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      firstName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      mobile: {
        type: Sequelize.STRING(15),
        allowNull: false
      },
      company: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('dealer', 'admin'),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('dealers', ['username'], { name: 'idx_dealer_username' });
    await queryInterface.addIndex('dealers', ['email'], { name: 'idx_dealer_email' });
    await queryInterface.addIndex('dealers', ['role'], { name: 'idx_dealer_role' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('dealers');
  }
};

