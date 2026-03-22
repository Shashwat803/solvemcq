import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type ModelAttributes,
} from 'sequelize';
import type { Sequelize } from 'sequelize';

export type McqOptions = Record<'A' | 'B' | 'C' | 'D', string>;

export class Question extends Model<InferAttributes<Question>, InferCreationAttributes<Question>> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare documentId: string;
  declare text: string;
  declare options: McqOptions;
  declare correctAnswer: 'A' | 'B' | 'C' | 'D' | null;
  declare explanation: string | null;
  declare confidenceScore: number | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

export function initQuestion(sequelize: Sequelize): typeof Question {
  Question.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
      documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
      text: { type: DataTypes.TEXT, allowNull: false },
      options: { type: DataTypes.JSONB, allowNull: false },
      correctAnswer: {
        type: DataTypes.ENUM('A', 'B', 'C', 'D'),
        allowNull: true,
        field: 'correct_answer',
      },
      explanation: { type: DataTypes.TEXT, allowNull: true },
      confidenceScore: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        field: 'confidence_score',
      },
    } as ModelAttributes<Question>,
    {
      sequelize,
      tableName: 'questions',
      indexes: [
        { fields: ['tenant_id'] },
        { fields: ['tenant_id', 'document_id'] },
      ],
    },
  );
  return Question;
}
