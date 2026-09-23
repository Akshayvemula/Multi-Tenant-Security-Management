import { z } from 'zod';
import { HttpError } from './errors.js';

export const roles = ['ADMIN', 'MANAGER', 'USER'];
export const campaignStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
export const eventSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const eventStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];

export const idSchema = z.coerce.number().int().positive();

export function pagination(query) {
  const page = z.coerce.number().int().min(1).default(1).parse(query.page);
  const pageSize = z.coerce.number().int().min(1).max(100).default(20).parse(query.pageSize);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function pageResult(rows, total, { page, pageSize }) {
  return { data: rows, pagination: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) } };
}

export function allowSort(value, values, fallback) {
  return values.includes(value) ? value : fallback;
}

export function assertStatusTransition(current, next) {
  if (current === next) return;
  const allowed = {
    DRAFT: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: []
  };
  if (!allowed[current]?.includes(next)) {
    throw new HttpError(400, `Campaign status cannot transition from ${current} to ${next}`);
  }
}

