'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visits', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      quotationId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'quotations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      dealerId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'dealers',
          key: 'id'
        }
      },
      visitDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      visitTime: {
        type: Sequelize.TIME,
        allowNull: false
      },
      location: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      locationLink: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'completed', 'incomplete', 'rejected', 'rescheduled'),
        defaultValue: 'pending'
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      length: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      width: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      height: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      images: {
        type: Sequelize.JSONB,
        allowNull: true
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

    await queryInterface.addIndex('visits', ['quotationId'], { name: 'idx_visit_quotation' });
    await queryInterface.addIndex('visits', ['dealerId'], { name: 'idx_visit_dealer' });
    await queryInterface.addIndex('visits', ['visitDate', 'visitTime'], { name: 'idx_visit_date' });
    await queryInterface.addIndex('visits', ['status'], { name: 'idx_visit_status' });
    await queryInterface.addIndex('visits', ['dealerId', 'visitDate', 'status'], { name: 'idx_visit_dealer_date' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('visits');
  }
};


