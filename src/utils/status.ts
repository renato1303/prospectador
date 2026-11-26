import { WebsiteStatus } from '../types';

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  no_website: 'Sem site',
  social_only: 'Só rede social',
  has_website: 'Tem site',
};

export const WEBSITE_STATUS_COLORS: Record<WebsiteStatus, string> = {
  no_website: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  social_only: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  has_website: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
};

export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function isBrazilianMobile(phoneStr?: string): boolean {
  if (!phoneStr) return false;
  const digits = normalizePhone(phoneStr);
  if (digits.length === 11 && digits[2] === '9') return true;
  if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') return true;
  return false;
}

const MAPS_DOMAINS = ['google.com/maps', 'maps.app.goo.gl', 'goo.gl/maps', 'g.page'];
const SOCIAL_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'linktr.ee',
  'linktree',
  'beacons.ai',
  'bio.link',
  'taplink',
  'wa.me',
  'whatsapp',
  'tiktok',
  'youtube',
  'twitter',
  'x.com',
  'linkedin',
  'ifood',
  'business.site',
  'site.google.com',
  'wixsite.com',
  'negocio.site',
];

export function classifyWebsite(url?: string): WebsiteStatus {
  if (!url) return 'no_website';
  const val = url.trim().toLowerCase();
  if (!val || val === '-' || val === 'n/a' || val === 'não possui' || val === 'sem site' || val === 'nao possui') {
    return 'no_website';
  }

  // Check if it's a maps link
  if (MAPS_DOMAINS.some((d) => val.includes(d))) {
    return 'no_website';
  }

  // Check if it's social or profile link
  if (SOCIAL_DOMAINS.some((d) => val.includes(d))) {
    return 'social_only';
  }

  return 'has_website';
}
