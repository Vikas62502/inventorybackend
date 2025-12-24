import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DealerAttributes {
  id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  company?: string | null;
  role: 'dealer' | 'admin';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DealerCreationAttributes extends Optional<DealerAttributes, 'id' | 'company' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class Dealer extends Model<DealerAttributes, DealerCreationAttributes> implements DealerAttributes {
  public id!: string;
  public username!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public mobile!: string;
  public company!: string | null;
  public role!: 'dealer' | 'admin';
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Dealer.init(
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
    company: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('dealer', 'admin'),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'dealers',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['role'] }
    ]
  }
);

export default Dealer;

