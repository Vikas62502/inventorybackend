import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CustomPanelAttributes {
  id: string;
  quotationId: string;
  brand: string;
  size: string;
  quantity: number;
  type: 'dcr' | 'non-dcr';
  price: number;
  createdAt?: Date;
}

interface CustomPanelCreationAttributes extends Optional<CustomPanelAttributes, 'id' | 'createdAt'> {}

class CustomPanel extends Model<CustomPanelAttributes, CustomPanelCreationAttributes> implements CustomPanelAttributes {
  public id!: string;
  public quotationId!: string;
  public brand!: string;
  public size!: string;
  public quantity!: number;
  public type!: 'dcr' | 'non-dcr';
  public price!: number;
  public readonly createdAt!: Date;
}

CustomPanel.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    quotationId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    size: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('dcr', 'non-dcr'),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'custom_panels',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['quotationId'] }
    ]
  }
);

export default CustomPanel;

