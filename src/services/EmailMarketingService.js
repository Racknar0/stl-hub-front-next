import HttpService from './HttpService'

// Endpoints de /api/admin/email-marketing (solo admin).
export class EmailMarketingService extends HttpService {
  async overview() {
    const resp = await this.getData('/admin/email-marketing/overview')
    return resp.data
  }

  async audiences() {
    const resp = await this.getData('/admin/email-marketing/audiences')
    return resp.data
  }

  // stage: NEW | ACTIVE | DORMANT | OPTED_OUT | ALL
  async audience(stage = 'ALL', page = 1, pageSize = 25) {
    const resp = await this.getData(
      `/admin/email-marketing/audiences/${stage}?page=${page}&pageSize=${pageSize}`
    )
    return resp.data
  }

  async flows() {
    const resp = await this.getData('/admin/email-marketing/flows')
    return resp.data
  }

  async templates() {
    const resp = await this.getData('/admin/email-marketing/templates')
    return resp.data
  }

  // Ajustes y estado del motor de envíos propio.
  async engine() {
    const resp = await this.getData('/admin/email-marketing/engine')
    return resp.data
  }

  // changes: { enabled?, start?, dailyLimit?, dailyReserve? }
  async saveEngine(changes) {
    const resp = await this.putData('/admin/email-marketing', 'engine', changes)
    return resp.data
  }

  // Recalcula las etapas de todos los contactos.
  async sync() {
    const resp = await this.postData('/admin/email-marketing/sync', {})
    return resp.data
  }
}

const emailMarketingService = new EmailMarketingService()
export default emailMarketingService
