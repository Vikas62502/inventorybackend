import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StockRequestAttributes {
  id: string;
  primary_product_id?: string | null;
  primary_product_name?: string | null;
  primary_model?: string | null;
  total_quantity: number;
  requested_by_id?: string | null;
  requested_by_name: string;
  requested_by_role: 'admin' | 'agent';
  requested_from: string;
  requested_from_role: 'super-admin' | 'admin';
  status: 'pending' | 'dispatched' | 'confirmed' | 'rejected';
  rejection_reason?: string | null;
  requested_date?: Date;
  dispatched_date?: Date | null;
  confirmed_date?: Date | null;
  dispatch_image?: string | null;
  confirmation_image?: string | null;
  dispatched_by_id?: string | null;
  dispatched_by_name?: string | null;
  confirmed_by_id?: string | null;
  confirmed_by_name?: string | null;
  notes?: string | null;
}

interface StockRequestCreationAttributes extends Optional<StockRequestAttributes, 'id' | 'status' | 'requested_date' | 'primary_product_id' | 'primary_product_name' | 'primary_model' | 'requested_by_id' | 'rejection_reason' | 'dispatched_date' | 'confirmed_date' | 'dispatch_image' | 'confirmation_image' | 'dispatched_by_id' | 'dispatched_by_name' | 'confirmed_by_id' | 'confirmed_by_name' | 'notes'> {}

class StockRequest extends Model<StockRequestAttributes, StockRequestCreationAttributes> implements StockRequestAttributes {
  public id!: string;
  public primary_product_id!: string | null;
  public primary_product_name!: string | null;
  public primary_model!: string | null;
  public total_quantity!: number;
  public requested_by_id!: string | null;
  public requested_by_name!: string;
  public requested_by_role!: 'admin' | 'agent';
  public requested_from!: string;
  public requested_from_role!: 'super-admin' | 'admin';
  public status!: 'pending' | 'dispatched' | 'confirmed' | 'rejected';
  public rejection_reason!: string | null;
  public requested_date!: Date;
  public dispatched_date!: Date | null;
  public confirmed_date!: Date | null;
  public dispatch_image!: string | null;
  public confirmation_image!: string | null;
  public dispatched_by_id!: string | null;
  public dispatched_by_name!: string | null;
  public confirmed_by_id!: string | null;
  public confirmed_by_name!: string | null;
  public notes!: string | null;
}

StockRequest.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    primary_product_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    primary_product_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    primary_model: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    total_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    requested_by_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    requested_by_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    requested_by_role: {
      type: DataTypes.ENUM('admin', 'agent'),
      allowNull: false
    },
    requested_from: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    requested_from_role: {
      type: DataTypes.ENUM('super-admin', 'admin'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'dispatched', 'confirmed', 'rejected'),
      defaultValue: 'pending'
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requested_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    dispatched_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmed_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dispatch_image: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    confirmation_image: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    dispatched_by_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    dispatched_by_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    confirmed_by_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    confirmed_by_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'stock_requests',
    timestamps: false,
    indexes: [
      { fields: ['status'] },
      { fields: ['requested_by_id'] },
      { fields: ['requested_from'] },
      { fields: ['requested_date'] },
      { fields: ['dispatched_date'] },
      { fields: ['confirmed_date'] }
    ]
  }
);

export default StockRequest;

