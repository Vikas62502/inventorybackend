import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UserAttributes {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'super-admin' | 'admin' | 'agent' | 'account';
  is_active: boolean;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active' | 'created_by_id' | 'created_by_name' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public password!: string;
  public name!: string;
  public role!: 'super-admin' | 'admin' | 'agent' | 'account';
  public is_active!: boolean;
  public created_by_id!: string | null;
  public created_by_name!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('super-admin', 'admin', 'agent', 'account'),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_by_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    created_by_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    freezeTableName: true,
    underscored: false,
    indexes: [
      { fields: ['username'] },
      { fields: ['role'] },
      { fields: ['is_active'] },
      { fields: ['created_by_id'] }
    ]
  }
);

export default User;

