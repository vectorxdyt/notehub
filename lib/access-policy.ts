import {verifiedGoogleEmail} from './google-identity.mjs';

export type AccessPolicy = {publicAccess: boolean; allowedEmails: string[]};

export const DEFAULT_ACCESS_POLICY: AccessPolicy = {publicAccess: true, allowedEmails: []};

export function normalizeStudentEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length > 2 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validateAccessPolicy(value: unknown): AccessPolicy | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.publicAccess !== 'boolean' || !Array.isArray(record.allowedEmails) || record.allowedEmails.length > 500) return null;
  const emails = record.allowedEmails.map(normalizeStudentEmail);
  if (emails.some(email => email === null)) return null;
  return {publicAccess: record.publicAccess, allowedEmails: [...new Set(emails as string[])].sort()};
}

export function storedAccessPolicy(value: unknown, exists: boolean): AccessPolicy {
  if (!exists) return DEFAULT_ACCESS_POLICY;
  if (!value || typeof value !== 'object') return {publicAccess: false, allowedEmails: []};
  const record = value as Record<string, unknown>;
  const emails = Array.isArray(record.allowedEmails)
    ? [...new Set(record.allowedEmails.map(normalizeStudentEmail).filter((email): email is string => email !== null))].sort()
    : [];
  return {publicAccess: record.publicAccess === true, allowedEmails: emails};
}

export function approvedStudent(claims: unknown, policy: AccessPolicy): boolean {
  if (!claims || typeof claims !== 'object') return false;
  const email = verifiedGoogleEmail(claims as {email?: string; email_verified?: boolean; firebase?: {sign_in_provider?: string}});
  return email !== null && policy.allowedEmails.includes(email);
}

export function approvedViewerEmail(email: unknown, policy: AccessPolicy, teacherEmails: string | undefined): boolean {
  const normalized = normalizeStudentEmail(email);
  if (!normalized) return false;
  const teachers = (teacherEmails ?? '').split(',').map(normalizeStudentEmail).filter((value): value is string => value !== null);
  return teachers.includes(normalized) || policy.allowedEmails.includes(normalized);
}
