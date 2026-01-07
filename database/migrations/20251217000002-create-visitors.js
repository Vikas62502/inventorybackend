'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visitors', {
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
      employeeId: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
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

    await queryInterface.addIndex('visitors', ['username'], { name: 'idx_visitor_username' });
    await queryInterface.addIndex('visitors', ['email'], { name: 'idx_visitor_email' });
    await queryInterface.addIndex('visitors', ['isActive'], { name: 'idx_visitor_active' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('visitors');
  }
};


