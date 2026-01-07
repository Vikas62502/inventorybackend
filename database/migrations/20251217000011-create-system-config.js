'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_config', {
      configKey: {
        type: Sequelize.STRING(100),
        primaryKey: true,
        allowNull: false
      },
      configValue: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      dataType: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('system_config', ['category'], { name: 'idx_config_category' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('system_config');
  }
};


