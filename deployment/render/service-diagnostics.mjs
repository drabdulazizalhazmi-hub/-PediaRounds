/** Read-only, bounded dependency diagnostics. Never promotes migration readiness. */
export function createDependencyMonitor({backend, now = Date.now, ttlMs = 30000, timeoutMs = 4000} = {}) {
  if (!backend || typeof backend.probe !== 'function') throw new TypeError('A backend probe is required.');
  if (!Number.isFinite(ttlMs) || ttlMs < 0 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('Invalid diagnostic timing.');
  let cached = null, checkedAtMs = null, pending = null;
  const unavailable = (reason) => ({
    configured: backend.configured === true,
    authReachable: false,
    anonymousDatabaseDenied: false,
    dependencyCheck: reason,
  });
  function check() {
    if (cached && checkedAtMs !== null && now() >= checkedAtMs && now() - checkedAtMs < ttlMs) return Promise.resolve({...cached});
    if (pending) return pending.then(value => ({...value}));
    let timer;
    const deadline = new Promise(resolve => {
      timer = setTimeout(() => resolve(unavailable('timeout')), timeoutMs);
    });
    // Only copy boolean health fields. Never return provider responses or credentials.
    const attempt = Promise.resolve().then(() => backend.probe()).then(result => {
      const configured = backend.configured === true && result?.configured === true;
      const authReachable = configured && result?.authReachable === true;
      const anonymousDatabaseDenied = configured && result?.anonymousDatabaseDenied === true;
      return {configured, authReachable, anonymousDatabaseDenied,
        dependencyCheck: configured && authReachable && anonymousDatabaseDenied ? 'ok' : 'unavailable'};
    }, () => unavailable('unavailable'));
    pending = Promise.race([attempt, deadline]).then(value => {
      checkedAtMs = now();
      cached = {...value, checkedAt: new Date(checkedAtMs).toISOString()};
      return {...cached};
    }).finally(() => {clearTimeout(timer); pending = null;});
    return pending;
  }
  return {check};
}

export function studyInfrastructureStatus(backend, study) {
  const bank = study?.bank;
  const checks = {
    authConfigured: backend?.configured === true && study?.authConfigured === true,
    authReachable: backend?.authReachable === true,
    anonymousDatabaseDenied: backend?.anonymousDatabaseDenied === true,
    repositoryBankLoaded: Number.isSafeInteger(bank?.questionCount) && bank.questionCount > 0 &&
      bank.fileErrors === 0 && bank.skippedRecords === 0 && bank.duplicateIDs === 0,
  };
  const infrastructureReady = Object.values(checks).every(value => value === true);
  return {status: infrastructureReady ? 'ok' : 'unavailable',
    scope: 'repository-study-beta-dependencies-only', infrastructureReady,
    applicationReady: false, fullSiteMigrated: false, legacyAccountsMigrated: false,
    legacyProgressMigrated: false, originalImagesMigrated: false, realUserEndToEndTested: false,
    checkedAt: backend?.checkedAt ?? null, checks};
}
