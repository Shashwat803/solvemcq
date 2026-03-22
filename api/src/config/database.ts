import { Sequelize } from 'sequelize';
import { env } from './env';

export function createSequelize(): Sequelize {
  const e = env();
  const useSsl = e.NODE_ENV === 'production' || e.DATABASE_URL.includes('neon.tech');

  return new Sequelize(e.DATABASE_URL, {
    dialect: 'postgres',
    logging: e.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: useSsl ? { require: true, rejectUnauthorized: false } : false,
      /** Fail faster than default when host is unreachable (Neon/firewall issues). */
      connectionTimeoutMillis: 15000,
    },
    define: {
      underscored: true,
      timestamps: true,
    },
  });
}
