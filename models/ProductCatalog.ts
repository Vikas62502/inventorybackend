import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ProductCatalogAttributes {
  id: string;
  category: 'panel' | 'inverter' | 'structure' | 'meter' | 'cable' | 'acdb' | 'dcdb' | 'battery';
  brand: string;
  model?: string | null;
  size?: string | null;
  basePrice: number;
  description?: string | null;
  specifications?: any | null; // JSONB field
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCatalogCreationAttributes extends Optional<ProductCatalogAttributes, 'id' | 'model' | 'size' | 'description' | 'specifications' | 'isActive' | 'createdAt' | 'updatedAt'> {}

class ProductCatalog extends Model<ProductCatalogAttributes, ProductCatalogCreationAttributes> implements ProductCatalogAttributes {
  public id!: string;
  public category!: 'panel' | 'inverter' | 'structure' | 'meter' | 'cable' | 'acdb' | 'dcdb' | 'battery';
  public brand!: string;
  public model!: string | null;
  public size!: string | null;
  public basePrice!: number;
  public description!: string | null;
  public specifications!: any | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductCatalog.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    category: {
      type: DataTypes.ENUM('panel', 'inverter', 'structure', 'meter', 'cable', 'acdb', 'dcdb', 'battery'),
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    size: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    basePrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    specifications: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'product_catalog',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['category'] },
      { fields: ['brand'] },
      { fields: ['isActive'] }
    ]
  }
);

export default ProductCatalog;


