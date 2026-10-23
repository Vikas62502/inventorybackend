import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type OfficeOutsideFileType = 'loan' | 'cash' | 'mix';
export type OfficeOutsideStatus = 'draft' | 'sent_to_accounts' | 'sent_to_outside';
export type OfficeOutsidePaymentStatus = 'pending' | 'partial' | 'completed';

interface OfficeOutsideRecordAttributes {
  id: string;
  vendorId: string | null;
  customerName: string;
  customerMobile: string;
  address: string;
  city: string;
  systemKw: number;
  subtotal: number;
  loanAmount: number;
  cashAmount: number;
  fileType: OfficeOutsideFileType | null;
  status: OfficeOutsideStatus;
  paymentStatus: OfficeOutsidePaymentStatus;
  paymentMode: string | null;
  installmentsJson: unknown[] | null;
  sentToAccountsAt: Date | null;
  sentToAccountsBy: string | null;
  sentToOutsideAt: Date | null;
  slipItems: unknown[] | null;
  slipNotes: string;
  notes: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OfficeOutsideRecordCreationAttributes
  extends Optional<
    OfficeOutsideRecordAttributes,
    | 'id'
    | 'vendorId'
    | 'customerMobile'
    | 'address'
    | 'city'
    | 'systemKw'
    | 'subtotal'
    | 'loanAmount'
    | 'cashAmount'
    | 'fileType'
    | 'status'
    | 'paymentStatus'
    | 'paymentMode'
    | 'installmentsJson'
    | 'sentToAccountsAt'
    | 'sentToAccountsBy'
    | 'sentToOutsideAt'
    | 'slipItems'
    | 'slipNotes'
    | 'notes'
    | 'createdBy'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
  > {}

class OfficeOutsideRecord
  extends Model<OfficeOutsideRecordAttributes, OfficeOutsideRecordCreationAttributes>
  implements OfficeOutsideRecordAttributes {
  public id!: string;
  public vendorId!: string | null;
  public customerName!: string;
  public customerMobile!: string;
  public address!: string;
  public city!: string;
  public systemKw!: number;
  public subtotal!: number;
  public loanAmount!: number;
  public cashAmount!: number;
  public fileType!: OfficeOutsideFileType | null;
  public status!: OfficeOutsideStatus;
  public paymentStatus!: OfficeOutsidePaymentStatus;
  public paymentMode!: string | null;
  public installmentsJson!: unknown[] | null;
  public sentToAccountsAt!: Date | null;
  public sentToAccountsBy!: string | null;
  public sentToOutsideAt!: Date | null;
  public slipItems!: unknown[] | null;
  public slipNotes!: string;
  public notes!: string;
  public createdBy!: string | null;
  public updatedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OfficeOutsideRecord.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    vendorId: { type: DataTypes.UUID, allowNull: true, field: 'vendor_id' },
    customerName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      field: 'customer_name'
    },
    customerMobile: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
      field: 'customer_mobile'
    },
    address: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    city: { type: DataTypes.STRING(128), allowNull: false, defaultValue: '' },
    systemKw: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      defaultValue: 0,
      field: 'system_kw'
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    loanAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'loan_amount'
    },
    cashAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'cash_amount'
    },
    fileType: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: 'file_type'
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'draft'
    },
    paymentStatus: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'pending',
      field: 'payment_status'
    },
    paymentMode: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'payment_mode'
    },
    installmentsJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'installments_json'
    },
    sentToAccountsAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_to_accounts_at' },
    sentToAccountsBy: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'sent_to_accounts_by'
    },
    sentToOutsideAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_to_outside_at' },
    slipItems: { type: DataTypes.JSONB, allowNull: true, field: 'slip_items' },
    slipNotes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '', field: 'slip_notes' },
    notes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    createdBy: { type: DataTypes.STRING(50), allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.STRING(50), allowNull: true, field: 'updated_by' }
  },
  {
    sequelize,
    tableName: 'office_outside_records',
    underscored: true,
    timestamps: true,
    freezeTableName: true,
    indexes: [
      {
        name: 'office_outside_mobile_unique',
        unique: true,
        fields: ['customer_mobile'],
        where: sequelize.literal('length(customer_mobile) = 10')
      }
    ]
  }
);

export default OfficeOutsideRecord;
