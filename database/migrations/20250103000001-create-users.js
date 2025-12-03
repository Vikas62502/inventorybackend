'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['super-admin', 'admin', 'agent', 'account']]
        }
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_by_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      created_by_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add check constraint for role
    await queryInterface.sequelize.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('super-admin', 'admin', 'agent', 'account'))
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};

