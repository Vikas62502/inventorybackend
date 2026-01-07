'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quotations', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      dealerId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'dealers',
          key: 'id'
        }
      },
      customerId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id'
        }
      },
      systemType: {
        type: Sequelize.ENUM('on-grid', 'off-grid', 'hybrid', 'dcr', 'non-dcr', 'both', 'customize'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed'),
        defaultValue: 'pending'
      },
      discount: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      finalAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
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
      },
      validUntil: {
        type: Sequelize.DATEONLY,
        allowNull: false
      }
    });

    await queryInterface.addIndex('quotations', ['dealerId'], { name: 'idx_quotation_dealer' });
    await queryInterface.addIndex('quotations', ['customerId'], { name: 'idx_quotation_customer' });
    await queryInterface.addIndex('quotations', ['status'], { name: 'idx_quotation_status' });
    await queryInterface.addIndex('quotations', ['createdAt'], { name: 'idx_quotation_date' });
    await queryInterface.addIndex('quotations', ['dealerId', 'status'], { name: 'idx_quotation_dealer_status' });
    await queryInterface.addIndex('quotations', ['createdAt', 'status'], { name: 'idx_quotation_date_status' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('quotations');
  }
};


