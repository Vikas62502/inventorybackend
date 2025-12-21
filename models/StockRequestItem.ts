import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StockRequestItemAttributes {
  id: string;
  stock_request_id: string;
  product_id?: string | null;
  product_name: string;
  model: string;
  quantity: number;
}

interface StockRequestItemCreationAttributes extends Optional<StockRequestItemAttributes, 'id' | 'product_id'> {}

class StockRequestItem extends Model<StockRequestItemAttributes, StockRequestItemCreationAttributes> implements StockRequestItemAttributes {
  public id!: string;
  public stock_request_id!: string;
  public product_id!: string | null;
  public product_name!: string;
  public model!: string;
  public quantity!: number;
}

StockRequestItem.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    stock_request_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    product_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    product_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    }
  },
  {
    sequelize,
    tableName: 'stock_request_items',
    timestamps: false,
    indexes: [
      { fields: ['stock_request_id'], name: 'idx_stock_request_items_request' }
    ]
  }
);

export default StockRequestItem;



