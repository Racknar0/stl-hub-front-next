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
}

const accountService = new AccountService();
export default accountService;
