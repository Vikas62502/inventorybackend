import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StockReturnAttributes {
  id: string;
  admin_id: string;
  product_id: string;
  quantity: number;
  return_date?: Date;
  reason?: string | null;
  status: 'pending' | 'completed';
  processed_by?: string | null;
  processed_date?: Date | null;
  notes?: string | null;
}

interface StockReturnCreationAttributes extends Optional<StockReturnAttributes, 'id' | 'return_date' | 'status' | 'reason' | 'processed_by' | 'processed_date' | 'notes'> {}

class StockReturn extends Model<StockReturnAttributes, StockReturnCreationAttributes> implements StockReturnAttributes {
  public id!: string;
  public admin_id!: string;
  public product_id!: string;
  public quantity!: number;
  public return_date!: Date;
  public reason!: string | null;
  public status!: 'pending' | 'completed';
  public processed_by!: string | null;
  public processed_date!: Date | null;
  public notes!: string | null;
}

StockReturn.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    admin_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    product_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    return_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed'),
      defaultValue: 'pending'
    },
    processed_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    processed_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'stock_returns',
    timestamps: false,
    indexes: [
      { fields: ['admin_id'] },
      { fields: ['product_id'] },
      { fields: ['status'] },
      { fields: ['return_date'] }
    ]
  }
);

export default StockReturn;



