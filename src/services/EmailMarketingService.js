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

  // Envía un paso del embudo al correo del admin que lo pide (kind: WELCOME_1..4).
  async sendTest(kind) {
    const resp = await this.postData('/admin/email-marketing/engine/test', { kind })
    return resp.data
  }

  // Estado del reenganche de dormidos.
  async reengage() {
    const resp = await this.getData('/admin/email-marketing/reengage')
    return resp.data
  }

  // Pone en cola una tanda de reenganche.
  async launchReengage(batchSize) {
    const resp = await this.postData('/admin/email-marketing/reengage/launch', { batchSize })
    return resp.data
  }

  // Historial de envíos. params: { status, kind, q, campaign, page, pageSize }
  async sends(params = {}) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) qs.set(k, v)
    })
    const resp = await this.getData(`/admin/email-marketing/sends?${qs.toString()}`)
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
