import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface VisitorAttributes {
  id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  employeeId?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface VisitorCreationAttributes extends Optional<VisitorAttributes, 'id' | 'employeeId' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class Visitor extends Model<VisitorAttributes, VisitorCreationAttributes> implements VisitorAttributes {
  public id!: string;
  public username!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public mobile!: string;
  public employeeId!: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Visitor.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    mobile: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'visitors',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['isActive'] }
    ]
  }
);

export default Visitor;


