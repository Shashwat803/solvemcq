import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  type ModelAttributes,
} from 'sequelize';
import type { Sequelize } from 'sequelize';

export type UserRole = 'admin' | 'member';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

export function initUser(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tenant_id',
      },
      email: { type: DataTypes.STRING(320), allowNull: false },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
      role: {
        type: DataTypes.ENUM('admin', 'member'),
        allowNull: false,
        defaultValue: 'member',
      },
    } as ModelAttributes<User>,
    {
      sequelize,
      tableName: 'users',
      indexes: [{ unique: true, fields: ['tenant_id', 'email'] }],
    },
  );
  return User;
}
