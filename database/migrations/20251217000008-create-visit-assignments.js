'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visit_assignments', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      visitId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'visits',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      visitorId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'visitors',
          key: 'id'
        }
      },
      visitorName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      assignedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('visit_assignments', ['visitId'], { name: 'idx_assignment_visit' });
    await queryInterface.addIndex('visit_assignments', ['visitorId'], { name: 'idx_assignment_visitor' });
    await queryInterface.addIndex('visit_assignments', ['visitorId', 'visitId'], { name: 'idx_visitor_assignments' });
    
    // Unique constraint for visit-visitor combination
    await queryInterface.addIndex('visit_assignments', ['visitId', 'visitorId'], {
      unique: true,
      name: 'idx_unique_assignment'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('visit_assignments');
  }
};

