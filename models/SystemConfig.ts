import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SystemConfigAttributes {
  configKey: string;
  configValue: string;
  dataType: string;
  description?: string | null;
  category?: string | null;
  updatedAt?: Date;
}

interface SystemConfigCreationAttributes extends Optional<SystemConfigAttributes, 'description' | 'category' | 'updatedAt'> {}

class SystemConfig extends Model<SystemConfigAttributes, SystemConfigCreationAttributes> implements SystemConfigAttributes {
  public configKey!: string;
  public configValue!: string;
  public dataType!: string;
  public description!: string | null;
  public category!: string | null;
  public readonly updatedAt!: Date;
}

SystemConfig.init(
  {
    configKey: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    configValue: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dataType: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'system_config',
    timestamps: false,
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['category'] }
    ]
  }
);

export default SystemConfig;

