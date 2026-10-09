import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SubvendorLeaserPaymentAttributes {
  id: string;
  vendorId: string;
  date: string | null;
  amount: number;
  type: string;
  remark: string;
  customerIds: string[];
  sortOrder: number;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubvendorLeaserPaymentCreationAttributes
  extends Optional<
    SubvendorLeaserPaymentAttributes,
    'id' | 'date' | 'amount' | 'type' | 'remark' | 'customerIds' | 'sortOrder' | 'updatedBy' | 'createdAt' | 'updatedAt'
  > {}

class SubvendorLeaserPayment
  extends Model<SubvendorLeaserPaymentAttributes, SubvendorLeaserPaymentCreationAttributes>
  implements SubvendorLeaserPaymentAttributes {
  public id!: string;
  public vendorId!: string;
  public date!: string | null;
  public amount!: number;
  public type!: string;
  public remark!: string;
  public customerIds!: string[];
  public sortOrder!: number;
  public updatedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SubvendorLeaserPayment.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    remark: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    customerIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'customer_ids' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    updatedBy: { type: DataTypes.STRING(50), allowNull: true, field: 'updated_by' }
  },
  {
    sequelize,
    tableName: 'subvendor_leaser_payments',
    underscored: true,
    timestamps: true,
    freezeTableName: true
  }
);

export default SubvendorLeaserPayment;
