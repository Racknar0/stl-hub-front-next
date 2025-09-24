import HttpService from './HttpService';
import { showApiError } from '../helpers/apiErrorHandler';

export class AssetService extends HttpService {
  async createFull(formValues) {
    // formValues: { title, titleEn?, categories?, tags?, isPremium?, accountId, archiveFile:File, images:File[] }
    try {
      const form = new FormData();
      for (const [k, v] of Object.entries(formValues)) {
        if (v === undefined || v === null) continue;
        if (k === 'archiveFile') continue; // manejar abajo
        if (k === 'images') continue; // manejar abajo
        if (Array.isArray(v)) {
          form.append(k, JSON.stringify(v));
        } else {
          form.append(k, v);
        }
      }
      if (formValues.archiveFile) {
        form.append('archive', formValues.archiveFile);
      }
      if (Array.isArray(formValues.images)) {
        for (const img of formValues.images) form.append('images', img);
      }
      const resp = await this.postFormData('/assets/full', form);
      return resp.data;
    } catch (err) {
      showApiError(err, 'No se pudo crear el asset');
      throw err; // re-lanzar si el caller quiere lógica adicional
    }
  }
}

const assetService = new AssetService();
export default assetService;
