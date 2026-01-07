import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface VisitAssignmentAttributes {
  id: string;
  visitId: string;
  visitorId: string;
  visitorName: string;
  assignedAt?: Date;
}

interface VisitAssignmentCreationAttributes extends Optional<VisitAssignmentAttributes, 'id' | 'assignedAt'> {}

class VisitAssignment extends Model<VisitAssignmentAttributes, VisitAssignmentCreationAttributes> implements VisitAssignmentAttributes {
  public id!: string;
  public visitId!: string;
  public visitorId!: string;
  public visitorName!: string;
  public readonly assignedAt!: Date;
}

VisitAssignment.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    visitId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    visitorId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    visitorName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    assignedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'visit_assignments',
    timestamps: false,
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['visitId'] },
      { fields: ['visitorId'] },
      { 
        unique: true,
        fields: ['visitId', 'visitorId'],
        name: 'idx_unique_assignment'
      },
      { fields: ['visitorId', 'visitId'] }
    ]
  }
);

export default VisitAssignment;

