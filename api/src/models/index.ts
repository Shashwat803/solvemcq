import type { Sequelize } from 'sequelize';
import { createSequelize } from '../config/database';
import { initTenant, Tenant } from './Tenant';
import { initUser, User } from './User';
import { initDocument, Document } from './Document';
import { initQuestion, Question } from './Question';
import { initAnswer, Answer } from './Answer';
import { env } from '../config/env';

let sequelizeInstance: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!sequelizeInstance) {
    sequelizeInstance = createSequelize();
  }
  return sequelizeInstance;
}

export function initModels(sequelize: Sequelize = getSequelize()) {
  initTenant(sequelize);
  initUser(sequelize);
  initDocument(sequelize);
  initQuestion(sequelize);
  initAnswer(sequelize);

  Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
  User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

  Tenant.hasMany(Document, { foreignKey: 'tenantId', as: 'documents' });
  Document.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

  Document.hasMany(Question, { foreignKey: 'documentId', as: 'questions' });
  Question.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

  Tenant.hasMany(Question, { foreignKey: 'tenantId', as: 'questions' });
  Question.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

  Question.hasMany(Answer, { foreignKey: 'questionId', as: 'answers' });
  Answer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

  Tenant.hasMany(Answer, { foreignKey: 'tenantId', as: 'answers' });
  Answer.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

  return { sequelize, Tenant, User, Document, Question, Answer };
}

export async function syncModelsIfEnabled() {
  const e = env();
  if (e.SYNC_DB && e.NODE_ENV === 'development') {
    const s = getSequelize();
    initModels(s);
    await s.sync({ alter: true });
  }
}

export { Tenant, User, Document, Question, Answer };
