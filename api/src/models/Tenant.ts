import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type ModelAttributes,
} from 'sequelize';
import type { Sequelize } from 'sequelize';

export class Tenant extends Model<InferAttributes<Tenant>, InferCreationAttributes<Tenant>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare slug: string;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

export function initTenant(sequelize: Sequelize): typeof Tenant {
  Tenant.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(255), allowNull: false },
      slug: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    } as ModelAttributes<Tenant>,
    { sequelize, tableName: 'tenants' },
  );
  return Tenant;
}
