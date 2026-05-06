import HttpService from './HttpService';
import { showApiError } from '../helpers/apiErrorHandler';

export class AccountService extends HttpService {
  async syncMainToBackups(mainId) {
    try {
      console.log('[FRONT][SYNC] iniciando sync main->backups mainId=', mainId);
      const resp = await this.postData(`/accounts/${mainId}/sync-main-backups`, {});
      console.log('[FRONT][SYNC] respuesta sync:', resp.data);
      return resp.data;
    } catch (err) {
      showApiError(err, 'Error sincronizando main -> backups');
      console.error('[FRONT][SYNC] error:', err);
      throw err;
    }
  }

  async syncBackupsToMain(mainId) {
    try {
  console.log('[FRONT][RESTORE] iniciando restore backups->main mainId=', mainId);
  const resp = await this.postData(`/accounts/${mainId}/restore-from-backups`, {});
  console.log('[FRONT][RESTORE] respuesta restore:', resp.data);
      return resp.data;
    } catch (err) {
      showApiError(err, 'Error restaurando desde backups');
      console.error('[FRONT][RESTORE] error:', err);
      throw err;
    }
  }

  async auditAlignment(mainId, { signal } = {}) {
    try {
      const resp = await this.postData(`/accounts/${mainId}/alignment-audit`, {}, { signal });
      return resp.data;
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') throw err;
      showApiError(err, 'Error auditando alineación');
      throw err;
    }
  }

  async syncAlignment(mainId, slugs, { signal } = {}) {
    try {
      const resp = await this.postData(`/accounts/${mainId}/alignment-sync`, { slugs }, { signal });
      return resp.data;
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') throw err;
      showApiError(err, 'Error sincronizando alineación');
      throw err;
    }
  }

  async cleanupAlignment(mainId, folders, target = 'backup', { signal } = {}) {
    try {
      const resp = await this.postData(`/accounts/${mainId}/alignment-cleanup`, { folders, target }, { signal });
      return resp.data;
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') throw err;
      showApiError(err, 'Error eliminando huérfanos');
      throw err;
    }
  }

  async cleanupAlignmentUnified(mainId, mainFolders, backupFolders, { signal } = {}) {
    try {
      const resp = await this.postData(`/accounts/${mainId}/alignment-cleanup-unified`, { mainFolders, backupFolders }, { signal });
      return resp.data;
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') throw err;
      showApiError(err, 'Error eliminando huérfanos');
      throw err;
    }
  }

  async restoreAlignment(mainId, slugs, { signal } = {}) {
    try {
      const resp = await this.postData(`/accounts/${mainId}/alignment-restore`, { slugs }, { signal });
      return resp.data;
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') throw err;
      showApiError(err, 'Error restaurando desde backup');
      throw err;
    }
  }

  async ghostCleanupAlignment(mainId, assetIds, { signal } = {}) {
    try {
      const resp = await this.postData(`/accounts/${mainId}/alignment-ghost-cleanup`, { assetIds }, { signal });
      return resp.data;
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') throw err;
      showApiError(err, 'Error eliminando registros fantasma');
      throw err;
    }
  }
}

const accountService = new AccountService();
export default accountService;
