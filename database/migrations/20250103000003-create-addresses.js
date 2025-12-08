'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('addresses', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      line1: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      line2: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      state: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      postal_code: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      country: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('addresses');
  }
};


