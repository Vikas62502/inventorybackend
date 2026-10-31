import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SubvendorBillAttributes {
  id: string;
  vendorId: string;
  date: string | null;
  basicAmount: number;
  paymentMode: string;
  remark: string;
  customerIds: string[];
  billFileName: string;
  billFileData: string | null;
  billFileUrl: string | null;
  sortOrder: number;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubvendorBillCreationAttributes
  extends Optional<
    SubvendorBillAttributes,
    | 'id'
    | 'date'
    | 'basicAmount'
    | 'paymentMode'
    | 'remark'
    | 'customerIds'
    | 'billFileName'
    | 'billFileData'
    | 'billFileUrl'
    | 'sortOrder'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
  > {}

class SubvendorBill
  extends Model<SubvendorBillAttributes, SubvendorBillCreationAttributes>
  implements SubvendorBillAttributes {
  public id!: string;
  public vendorId!: string;
  public date!: string | null;
  public basicAmount!: number;
  public paymentMode!: string;
  public remark!: string;
  public customerIds!: string[];
  public billFileName!: string;
  public billFileData!: string | null;
  public billFileUrl!: string | null;
  public sortOrder!: number;
  public updatedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SubvendorBill.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    vendorId: { type: DataTypes.UUID, allowNull: false, field: 'vendor_id' },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    basicAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'basic_amount'
    },
    paymentMode: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: '',
      field: 'payment_mode'
    },
    remark: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    customerIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'customer_ids' },
    billFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      field: 'bill_file_name'
    },
    billFileData: { type: DataTypes.TEXT, allowNull: true, field: 'bill_file_data' },
    billFileUrl: { type: DataTypes.TEXT, allowNull: true, field: 'bill_file_url' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    updatedBy: { type: DataTypes.STRING(50), allowNull: true, field: 'updated_by' }
  },
  {
    sequelize,
    tableName: 'subvendor_bills',
    underscored: true,
    timestamps: true,
    freezeTableName: true,
    indexes: [{ name: 'subvendor_bills_vendor_idx', fields: ['vendor_id', 'sort_order'] }]
  }
);

export default SubvendorBill;
