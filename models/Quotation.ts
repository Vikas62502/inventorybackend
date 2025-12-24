import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface QuotationAttributes {
  id: string;
  dealerId: string;
  customerId: string;
  systemType: 'on-grid' | 'off-grid' | 'hybrid' | 'dcr' | 'non-dcr' | 'both' | 'customize';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  discount: number;
  finalAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
  validUntil: Date;
}

interface QuotationCreationAttributes extends Optional<QuotationAttributes, 'id' | 'status' | 'discount' | 'createdAt' | 'updatedAt'> {}

class Quotation extends Model<QuotationAttributes, QuotationCreationAttributes> implements QuotationAttributes {
  public id!: string;
  public dealerId!: string;
  public customerId!: string;
  public systemType!: 'on-grid' | 'off-grid' | 'hybrid' | 'dcr' | 'non-dcr' | 'both' | 'customize';
  public status!: 'pending' | 'approved' | 'rejected' | 'completed';
  public discount!: number;
  public finalAmount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public validUntil!: Date;
}

Quotation.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    dealerId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    customerId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    systemType: {
      type: DataTypes.ENUM('on-grid', 'off-grid', 'hybrid', 'dcr', 'non-dcr', 'both', 'customize'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
      defaultValue: 'pending'
    },
    discount: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    finalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    validUntil: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'quotations',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['dealerId'] },
      { fields: ['customerId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
      { fields: ['dealerId', 'status'] },
      { fields: ['createdAt', 'status'] }
    ]
  }
);

export default Quotation;

