import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type ModelAttributes,
} from 'sequelize';
import type { Sequelize } from 'sequelize';

export type McqLetter = 'A' | 'B' | 'C' | 'D';

export class Answer extends Model<InferAttributes<Answer>, InferCreationAttributes<Answer>> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare questionId: string;
  declare selectedOption: McqLetter;
  declare confidenceScore: number;
  declare explanation: string | null;
  declare validated: boolean;
  declare validationNotes: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

export function initAnswer(sequelize: Sequelize): typeof Answer {
  Answer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
      questionId: { type: DataTypes.UUID, allowNull: false, field: 'question_id' },
      selectedOption: {
        type: DataTypes.ENUM('A', 'B', 'C', 'D'),
        allowNull: false,
        field: 'selected_option',
      },
      confidenceScore: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
        field: 'confidence_score',
      },
      explanation: { type: DataTypes.TEXT, allowNull: true },
      validated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      validationNotes: { type: DataTypes.TEXT, allowNull: true, field: 'validation_notes' },
    } as ModelAttributes<Answer>,
    {
      sequelize,
      tableName: 'answers',
      indexes: [
        { fields: ['tenant_id'] },
        { unique: true, fields: ['tenant_id', 'question_id'] },
      ],
    },
  );
  return Answer;
}
