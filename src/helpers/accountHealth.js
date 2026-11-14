// Pending checks are not failures; expired sessions require intervention.
export const isFailedAccount = account => ['ERROR', 'EXPIRED'].includes(account?.status);

export const storageUsageColor = percent => percent > 100 ? '#ff183b' : percent > 98 ? '#fb4b60' : percent > 85 ? '#fb923c' : '#4ade80';

export const isAccountAtCapacity = account => {
  const quota = Number(account?.storageTotalMB) > 0 ? Number(account.storageTotalMB)
    : Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;
  return Math.max(0, Number(account?.storageUsedMB) || 0) >= quota;
};

export function summarizeAccountFailures(accounts = []) {
  const failed = accounts.filter(isFailedAccount);
  return {
    total: failed.length,
    main: failed.filter(account => account.type === 'main').length,
    backup: failed.filter(account => account.type === 'backup').length,
    errors: failed.filter(account => account.status === 'ERROR').length,
    expired: failed.filter(account => account.status === 'EXPIRED').length,
  };
}
