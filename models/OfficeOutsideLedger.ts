import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { SubvendorLedgerAmountField } from './SubvendorLedger';

interface OfficeOutsideLedgerAttributes extends Record<SubvendorLedgerAmountField, number> {
  id: string;
  recordId: string;
  vendorId: string | null;
  cashAmount: number;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OfficeOutsideLedgerCreationAttributes
  extends Optional<
    OfficeOutsideLedgerAttributes,
    'id' | 'vendorId' | 'cashAmount' | 'updatedBy' | 'createdAt' | 'updatedAt' | SubvendorLedgerAmountField
  > {}

class OfficeOutsideLedger
  extends Model<OfficeOutsideLedgerAttributes, OfficeOutsideLedgerCreationAttributes>
  implements OfficeOutsideLedgerAttributes {
  public id!: string;
  public recordId!: string;
  public vendorId!: string | null;
  public loanAmount!: number;
  public cashAmount!: number;
  public receivedAmount!: number;
  public remaining!: number;
  public proposal!: number;
  public costOfSite!: number;
  public fileCharges!: number;
  public pi!: number;
  public gstCharges!: number;
  public others!: number;
  public updatedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

const amountColumn = (field?: string) => ({
  type: DataTypes.DECIMAL(14, 2),
  allowNull: false,
  defaultValue: 0,
  ...(field ? { field } : {})
});

OfficeOutsideLedger.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    recordId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'record_id'
    },
    vendorId: { type: DataTypes.UUID, allowNull: true, field: 'vendor_id' },
    loanAmount: amountColumn('loan_amount'),
    cashAmount: amountColumn('cash_amount'),
    receivedAmount: amountColumn('received_amount'),
    remaining: amountColumn(),
    proposal: amountColumn(),
    costOfSite: amountColumn('cost_of_site'),
    fileCharges: amountColumn('file_charges'),
    pi: amountColumn(),
    gstCharges: amountColumn('gst_charges'),
    others: amountColumn(),
    updatedBy: { type: DataTypes.STRING(50), allowNull: true, field: 'updated_by' }
  },
  {
    sequelize,
    tableName: 'office_outside_ledger',
    underscored: true,
    timestamps: true,
    freezeTableName: true
  }
);

export default OfficeOutsideLedger;
