import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CustomerAttributes {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  dealerId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'dealerId' | 'createdAt' | 'updatedAt'> {}

class Customer extends Model<CustomerAttributes, CustomerCreationAttributes> implements CustomerAttributes {
  public id!: string;
  public firstName!: string;
  public lastName!: string;
  public mobile!: string;
  public email!: string;
  public streetAddress!: string;
  public city!: string;
  public state!: string;
  public pincode!: string;
  public dealerId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Customer.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    mobile: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    streetAddress: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    pincode: {
      type: DataTypes.STRING(6),
      allowNull: false
    },
    dealerId: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'customers',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['mobile'] },
      { fields: ['dealerId'] },
      { fields: ['state', 'city'] }
    ]
  }
);

export default Customer;

