import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export const SUBVENDOR_LEDGER_AMOUNT_FIELDS = [
  'loanAmount',
  'receivedAmount',
  'remaining',
  'proposal',
  'costOfSite',
  'fileCharges',
  'pi',
  'gstCharges',
  'others'
] as const;

export type SubvendorLedgerAmountField = (typeof SUBVENDOR_LEDGER_AMOUNT_FIELDS)[number];

interface SubvendorLedgerAttributes extends Record<SubvendorLedgerAmountField, number> {
  id: string;
  quotationId: string;
  vendorId: string | null;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SubvendorLedgerCreationAttributes
  extends Optional<
    SubvendorLedgerAttributes,
    'id' | 'vendorId' | 'updatedBy' | 'createdAt' | 'updatedAt' | SubvendorLedgerAmountField
  > {}

class SubvendorLedger
  extends Model<SubvendorLedgerAttributes, SubvendorLedgerCreationAttributes>
  implements SubvendorLedgerAttributes {
  public id!: string;
  public quotationId!: string;
  public vendorId!: string | null;
  public loanAmount!: number;
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

SubvendorLedger.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    quotationId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'quotation_id'
    },
    vendorId: { type: DataTypes.UUID, allowNull: true, field: 'vendor_id' },
    loanAmount: amountColumn('loan_amount'),
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
    tableName: 'subvendor_ledger',
    underscored: true,
    timestamps: true,
    freezeTableName: true
  }
);

export default SubvendorLedger;
