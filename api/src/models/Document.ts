import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type ModelAttributes,
} from 'sequelize';
import type { Sequelize } from 'sequelize';

export type DocumentKind = 'pdf' | 'image';
export type DocumentStatus =
  | 'pending'
  | 'ocr_processing'
  | 'ocr_failed'
  | 'parsing'
  | 'solving'
  | 'ready'
  | 'failed';

export class Document extends Model<InferAttributes<Document>, InferCreationAttributes<Document>> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare title: string;
  declare externalUrl: string;
  declare mimeType: string;
  declare kind: DocumentKind;
  declare status: DocumentStatus;
  declare localPath: string | null;
  declare ocrText: string | null;
  declare metadata: Record<string, unknown> | null;
  declare pdfUrl: string | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

export function initDocument(sequelize: Sequelize): typeof Document {
  Document.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
      title: { type: DataTypes.STRING(512), allowNull: false },
      externalUrl: { type: DataTypes.TEXT, allowNull: false, field: 'external_url' },
      mimeType: { type: DataTypes.STRING(128), allowNull: false, field: 'mime_type' },
      kind: {
        type: DataTypes.ENUM('pdf', 'image'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'ocr_processing',
          'ocr_failed',
          'parsing',
          'solving',
          'ready',
          'failed',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      localPath: { type: DataTypes.TEXT, allowNull: true, field: 'local_path' },
      ocrText: { type: DataTypes.TEXT, allowNull: true, field: 'ocr_text' },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      pdfUrl: { type: DataTypes.TEXT, allowNull: true, field: 'pdf_url' },
    } as ModelAttributes<Document>,
    {
      sequelize,
      tableName: 'documents',
      indexes: [{ fields: ['tenant_id'] }, { fields: ['tenant_id', 'created_at'] }],
    },
  );
  return Document;
}
