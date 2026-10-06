import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type SubvendorKind = 'office_inside' | 'office_outside';

interface SubvendorAttributes {
  id: string;
  kind: SubvendorKind;
  dealerId: string | null;
  name: string;
  contactName: string;
  mobile: string;
  email: string;
  city: string;
  category: string;
  notes: string;
  profitRatio: number;
  fileCostPerKw: number;
  leaserPaid: number;
  leaserRemaining: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubvendorCreationAttributes
  extends Optional<
    SubvendorAttributes,
    | 'id'
    | 'dealerId'
    | 'contactName'
    | 'mobile'
    | 'email'
    | 'city'
    | 'category'
    | 'notes'
    | 'profitRatio'
    | 'fileCostPerKw'
    | 'leaserPaid'
    | 'leaserRemaining'
    | 'createdAt'
    | 'updatedAt'
  > {}

class Subvendor
  extends Model<SubvendorAttributes, SubvendorCreationAttributes>
  implements SubvendorAttributes {
  public id!: string;
  public kind!: SubvendorKind;
  public dealerId!: string | null;
  public name!: string;
  public contactName!: string;
  public mobile!: string;
  public email!: string;
  public city!: string;
  public category!: string;
  public notes!: string;
  public profitRatio!: number;
  public fileCostPerKw!: number;
  public leaserPaid!: number;
  public leaserRemaining!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subvendor.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    kind: { type: DataTypes.STRING(32), allowNull: false },
    dealerId: { type: DataTypes.STRING(50), allowNull: true, field: 'dealer_id' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    contactName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      field: 'contact_name'
    },
    mobile: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '' },
    email: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    city: { type: DataTypes.STRING(128), allowNull: false, defaultValue: '' },
    category: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'Other' },
    notes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    profitRatio: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'profit_ratio'
    },
    fileCostPerKw: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 1000,
      field: 'file_cost_per_kw'
    },
    leaserPaid: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'leaser_paid'
    },
    leaserRemaining: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'leaser_remaining'
    }
  },
  {
    sequelize,
    tableName: 'subvendors',
    underscored: true,
    timestamps: true,
    freezeTableName: true
  }
);

export default Subvendor;
