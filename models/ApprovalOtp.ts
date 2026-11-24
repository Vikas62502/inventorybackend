import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type ApprovalOtpRecipient = 'kamlesh' | 'sunil' | 'hr';

interface ApprovalOtpAttributes {
  id: number;
  quotationId: string;
  otp: string;
  recipientKey: ApprovalOtpRecipient;
  mobileNumber: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type ApprovalOtpCreation = Optional<ApprovalOtpAttributes, 'id' | 'createdAt' | 'updatedAt'>;

class ApprovalOtp
  extends Model<ApprovalOtpAttributes, ApprovalOtpCreation>
  implements ApprovalOtpAttributes
{
  public id!: number;
  public quotationId!: string;
  public otp!: string;
  public recipientKey!: ApprovalOtpRecipient;
  public mobileNumber!: string;
  public expiresAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ApprovalOtp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    quotationId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'quotation_id'
    },
    otp: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    recipientKey: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'recipient_key'
    },
    mobileNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      field: 'mobile_number'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    }
  },
  {
    sequelize,
    tableName: 'approval_otps',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['quotation_id'], unique: true },
      { fields: ['expires_at'] }
    ]
  }
);

export default ApprovalOtp;
