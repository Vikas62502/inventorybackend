import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PricingRuleAttributes {
  id: string;
  productCategory: string;
  brand: string;
  size?: string | null;
  pricePerUnit: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  isActive: boolean;
  createdAt?: Date;
}

interface PricingRuleCreationAttributes extends Optional<PricingRuleAttributes, 'id' | 'size' | 'effectiveTo' | 'isActive' | 'createdAt'> {}

class PricingRule extends Model<PricingRuleAttributes, PricingRuleCreationAttributes> implements PricingRuleAttributes {
  public id!: string;
  public productCategory!: string;
  public brand!: string;
  public size!: string | null;
  public pricePerUnit!: number;
  public effectiveFrom!: Date;
  public effectiveTo!: Date | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
}

PricingRule.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    productCategory: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    size: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    pricePerUnit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'pricing_rules',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['productCategory', 'brand'] },
      { fields: ['effectiveFrom', 'effectiveTo'] },
      { fields: ['isActive'] }
    ]
  }
);

export default PricingRule;


