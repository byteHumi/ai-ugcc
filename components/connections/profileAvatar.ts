import type { Profile } from '@/types';

const AVATAR_STYLES = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/35 dark:text-sky-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-200',
  'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-200',
];

function hashSeed(seed: string): number {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return sum;
}

export function getProfileInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function getProfileAvatarClass(seed: string): string {
  return AVATAR_STYLES[hashSeed(seed) % AVATAR_STYLES.length];
}

export function getProfileAvatarClassFromProfile(profile: Profile): string {
  const seed = `${profile._id || ''}${profile.name || ''}`;
  return getProfileAvatarClass(seed);
}
