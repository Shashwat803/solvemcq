import bcrypt from 'bcrypt';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { signJwt } from '../middleware/auth';
import { env } from '../config/env';
import { HttpError } from '../utils/HttpError';

export async function registerUser(input: {
  tenantName: string;
  tenantSlug: string;
  email: string;
  password: string;
}) {
  const existing = await Tenant.findOne({ where: { slug: input.tenantSlug } });
  if (existing) {
    throw new HttpError(409, 'Tenant slug already in use');
  }

  const rounds = env().BCRYPT_ROUNDS;
  const passwordHash = await bcrypt.hash(input.password, rounds);

  const tenant = await Tenant.create({
    name: input.tenantName,
    slug: input.tenantSlug,
  });

  const user = await User.create({
    tenantId: tenant.id,
    email: input.email.toLowerCase(),
    passwordHash,
    role: 'admin',
  });

  const token = signJwt({
    sub: user.id,
    tenantId: tenant.id,
    email: user.email,
  });

  return { tenant, user: { id: user.id, email: user.email, role: user.role }, token };
}

export async function loginUser(input: { tenantSlug: string; email: string; password: string }) {
  const tenant = await Tenant.findOne({ where: { slug: input.tenantSlug } });
  if (!tenant) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const user = await User.findOne({
    where: { tenantId: tenant.id, email: input.email.toLowerCase() },
  });
  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const token = signJwt({
    sub: user.id,
    tenantId: tenant.id,
    email: user.email,
  });

  return { user: { id: user.id, email: user.email, role: user.role }, token };
}
