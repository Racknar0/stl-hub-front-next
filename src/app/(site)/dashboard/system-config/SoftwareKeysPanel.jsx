'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, Switch } from '@mui/material';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert, confirmAlert, fireAlert } from '@/helpers/alerts';
import { ConfigHelp } from './configSections';
import './software-keys.scss';

// Tab "Keys softwares": productos, seriales y clave pública del servidor de licencias.
// Los seriales en claro solo se ven una vez, en el diálogo que aparece al generarlos.

const STATUS_LABEL = { active: 'Activado', unused: 'Sin usar', revoked: 'Revocado' };
const fmtDate = (d) => (d ? new Date(d).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const apiError = (e, fallback) => e?.response?.data?.message || e?.response?.data?.error || fallback;

const copy = async (text, what = 'Copiado') => {
  try {
    await navigator.clipboard.writeText(text);
    await fireAlert({ title: what, icon: 'success', timer: 1200, showConfirmButton: false, zIndex: 2000 });
  } catch {
    await errorAlert('Error', 'No se pudo copiar al portapapeles');
  }
};

export default function SoftwareKeysPanel() {
  const http = useMemo(() => new HttpService(), []);
  const [keyInfo, setKeyInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newProduct, setNewProduct] = useState({ product_id: '', name: '' });
  const [gen, setGen] = useState({ product_id: '', count: 1, note: '' });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null); // { product_id, serials: [{id, serial, masked}] }

  const [filters, setFilters] = useState({ product_id: '', status: '', q: '' });
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ total: 0, serials: [], page_size: 50 });
  const [listLoading, setListLoading] = useState(false);
  const [lookup, setLookup] = useState('');

  const loadBase = useCallback(async () => {
    try {
      const [k, p] = await Promise.all([http.getData('/admin/licenses/public-key'), http.getData('/admin/licenses/products')]);
      setKeyInfo(k.data);
      setProducts(p.data || []);
      setGen(prev => (prev.product_id || !p.data?.length ? prev : { ...prev, product_id: p.data[0].product_id }));
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudo cargar el servidor de licencias'));
    } finally {
      setLoading(false);
    }
  }, [http]);

  const loadSerials = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: '50' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await http.getData(`/admin/licenses/serials?${params}`);
      setList(res.data);
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudieron cargar los seriales'));
    } finally {
      setListLoading(false);
    }
  }, [http, filters, page]);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => {
    const t = setTimeout(loadSerials, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadSerials, filters.q]);

  const refresh = async () => { await Promise.all([loadBase(), loadSerials()]); };

  const createProduct = async () => {
    try {
      await http.postData('/admin/licenses/products', newProduct);
      setNewProduct({ product_id: '', name: '' });
      await successAlert('Producto creado', `Usa product_id "${newProduct.product_id}" en el programa.`);
      await loadBase();
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudo crear el producto'));
    }
  };

  const toggleProduct = async (p) => {
    const ok = await confirmAlert(
      p.active ? 'Desactivar producto' : 'Activar producto',
      p.active ? `Ningún serial de "${p.name}" podrá activarse ni validarse hasta que lo reactives.` : `Los seriales de "${p.name}" volverán a funcionar.`,
      p.active ? 'Desactivar' : 'Activar', 'Cancelar', 'warning'
    );
    if (!ok) return;
    try {
      await http.patchData('/admin/licenses/products', p.id, { active: !p.active });
      await loadBase();
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudo actualizar el producto'));
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await http.postData('/admin/licenses/serials', { ...gen, count: Number(gen.count), note: gen.note || undefined });
      setGenerated(res.data);
      setGen(prev => ({ ...prev, note: '' }));
      await refresh();
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudieron generar los seriales'));
    } finally {
      setGenerating(false);
    }
  };

  const closeGenerated = async () => {
    const ok = await confirmAlert('¿Ya los copiaste?', 'Después de cerrar no se podrán volver a ver: en la base solo queda su hash.', 'Cerrar', 'Volver', 'warning');
    if (ok) setGenerated(null);
  };

  const revoke = async (s) => {
    const res = await fireAlert({
      title: 'Revocar serial', text: `${s.masked} dejará de funcionar en la próxima validación con conexión (máximo 30 días).`,
      input: 'text', inputPlaceholder: 'Motivo (opcional)', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Revocar', cancelButtonText: 'Cancelar', reverseButtons: true, zIndex: 2000,
    });
    if (!res.isConfirmed) return;
    try {
      await http.postData(`/admin/licenses/serials/${s.id}/revoke`, { reason: res.value || undefined });
      await refresh();
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudo revocar'));
    }
  };

  const unrevoke = async (s) => {
    if (!(await confirmAlert('Quitar revocación', `${s.masked} volverá a funcionar.`, 'Quitar revocación'))) return;
    try {
      await http.postData(`/admin/licenses/serials/${s.id}/unrevoke`, {});
      await refresh();
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudo quitar la revocación'));
    }
  };

  const resetActivation = async (s) => {
    if (!(await confirmAlert('Liberar activación', `${s.masked} quedará libre para activarse en otra instalación. La instalación actual dejará de validar.`, 'Liberar', 'Cancelar', 'warning'))) return;
    try {
      await http.postData(`/admin/licenses/serials/${s.id}/reset-activation`, {});
      await refresh();
    } catch (e) {
      await errorAlert('Error', apiError(e, 'No se pudo liberar la activación'));
    }
  };

  const doLookup = async () => {
    if (!lookup.trim()) return;
    try {
      const res = await http.postData('/admin/licenses/serials/lookup', { serial: lookup });
      const s = res.data;
      await fireAlert({
        title: `Serial #${s.id}`, icon: 'info', zIndex: 2000,
        html: `<div style="text-align:left;font-size:14px;line-height:1.7">
          <b>Producto:</b> ${s.product_name} (${s.product_id})<br/>
          <b>Estado:</b> ${STATUS_LABEL[s.status]}<br/>
          <b>Instalación:</b> ${s.installation_id || '—'}<br/>
          <b>Activado:</b> ${fmtDate(s.activated_at)}<br/>
          <b>Última validación:</b> ${fmtDate(s.last_validated_at)}
        </div>`,
      });
      setFilters({ product_id: '', status: '', q: String(s.id) });
      setPage(1);
    } catch (e) {
      await errorAlert('No encontrado', apiError(e, 'Ese serial no existe'));
    }
  };

  const setFilter = (k, v) => { setFilters(prev => ({ ...prev, [k]: v })); setPage(1); };
  const pages = Math.max(1, Math.ceil(list.total / (list.page_size || 50)));

  if (loading) return <div className="loading-state">Cargando licencias...</div>;

  return (
    <div className="software-keys">
      <div className="settings-grid">
        {/* Clave pública */}
        <article className="setting-card">
          <div className="setting-header">
            <h2>Clave de firma</h2>
            <ConfigHelp compact>Las licencias se firman con Ed25519. La clave privada vive solo en el .env del servidor; esta clave pública va dentro de los programas para verificar la licencia sin conexión.</ConfigHelp>
          </div>
          <div className="setting-body">
            {keyInfo?.configured ? (
              <>
                <div className="sk-kv"><span>Estado</span><span className="status-on">Configurada (kid: {keyInfo.kid})</span></div>
                <div className="sk-kv"><span>Duración de la licencia</span><span>{keyInfo.license_days} días</span></div>
                <pre className="sk-pem">{keyInfo.public_key_pem.trim()}</pre>
                <div className="sk-actions">
                  <button className="btn btn-sm btn-outline-info" onClick={() => copy(keyInfo.public_key_pem, 'PEM copiado')}>Copiar PEM</button>
                  <button className="btn btn-sm btn-outline-info" onClick={() => copy(keyInfo.public_key_raw_base64, 'Clave cruda copiada')}>Copiar Base64 (32 bytes)</button>
                </div>
              </>
            ) : (
              <div className="sk-warning">
                Falta <code>LICENSE_SIGNING_PRIVATE_KEY</code> en el .env del servidor. Sin ella los programas reciben <code>503 licensing_unavailable</code>.
                Genérala con <code>node scripts/generate-license-keys.js</code>.
              </div>
            )}
          </div>
        </article>

        {/* Productos */}
        <article className="setting-card">
          <div className="setting-header">
            <h2>Productos</h2>
            <ConfigHelp compact>Cada programa tiene un product_id que manda en cada solicitud. Un serial solo sirve para su producto.</ConfigHelp>
          </div>
          <div className="setting-body">
            {products.length === 0 && <div className="config-empty">Aún no hay productos.</div>}
            {products.map(p => (
              <div key={p.id} className="sk-product">
                <div className="sk-product-main">
                  <strong>{p.name}</strong>
                  <code>{p.product_id}</code>
                </div>
                <span className="sk-product-stats">{p.serials} seriales · {p.activated} activados · {p.revoked} revocados</span>
                <Switch size="small" checked={p.active} onChange={() => toggleProduct(p)} />
              </div>
            ))}
            <div className="sk-form-row">
              <input className="form-control form-control-sm" placeholder="product_id (p. ej. pondwatch-update)" value={newProduct.product_id}
                onChange={e => setNewProduct(prev => ({ ...prev, product_id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
              <input className="form-control form-control-sm" placeholder="Nombre visible" value={newProduct.name}
                onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))} />
              <button className="btn btn-sm btn-primary" disabled={!newProduct.product_id || !newProduct.name.trim()} onClick={createProduct}>Crear</button>
            </div>
          </div>
        </article>
      </div>

      {/* Generar seriales */}
      <article className="setting-card sk-wide">
        <div className="setting-header">
          <h2>Generar seriales</h2>
          <ConfigHelp compact>Se muestran una sola vez. Cópialos y guárdalos o entrégalos al cliente: en la base solo queda su hash.</ConfigHelp>
        </div>
        <div className="sk-form-row">
          <select className="form-select form-select-sm" value={gen.product_id} onChange={e => setGen(prev => ({ ...prev, product_id: e.target.value }))}>
            {products.length === 0 && <option value="">Crea un producto primero</option>}
            {products.map(p => <option key={p.id} value={p.product_id}>{p.name} ({p.product_id})</option>)}
          </select>
          <input type="number" min="1" max="100" className="form-control form-control-sm sk-count" value={gen.count}
            onChange={e => setGen(prev => ({ ...prev, count: e.target.value }))} aria-label="Cantidad" />
          <input className="form-control form-control-sm" placeholder="Nota (cliente, pedido…) opcional" maxLength={255} value={gen.note}
            onChange={e => setGen(prev => ({ ...prev, note: e.target.value }))} />
          <button className="btn btn-sm btn-primary" disabled={!gen.product_id || generating || !(Number(gen.count) >= 1 && Number(gen.count) <= 100)} onClick={generate}>
            {generating ? 'Generando…' : 'Generar'}
          </button>
        </div>
      </article>

      {/* Seriales */}
      <article className="setting-card sk-wide">
        <div className="setting-header">
          <h2>Seriales</h2>
          <span className="sk-total">{list.total.toLocaleString('es')}</span>
        </div>
        <div className="sk-form-row">
          <select className="form-select form-select-sm" value={filters.product_id} onChange={e => setFilter('product_id', e.target.value)}>
            <option value="">Todos los productos</option>
            {products.map(p => <option key={p.id} value={p.product_id}>{p.name}</option>)}
          </select>
          <select className="form-select form-select-sm" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="active">Activados</option>
            <option value="unused">Sin usar</option>
            <option value="revoked">Revocados</option>
          </select>
          <input className="form-control form-control-sm" placeholder="Buscar: ID, últimos 4, nota o instalación" value={filters.q} onChange={e => setFilter('q', e.target.value)} />
        </div>
        <div className="sk-form-row">
          <input className="form-control form-control-sm" placeholder="Consultar un serial completo (XXXXX-XXXXX-…)" value={lookup}
            onChange={e => setLookup(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doLookup(); }} />
          <button className="btn btn-sm btn-outline-info" disabled={!lookup.trim()} onClick={doLookup}>Consultar</button>
        </div>

        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr><th>ID</th><th>Serial</th><th>Producto</th><th>Estado</th><th>Instalación</th><th>Última validación</th><th>Nota</th><th /></tr>
            </thead>
            <tbody>
              {list.serials.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td><code>{s.masked}</code></td>
                  <td>{s.product_name}</td>
                  <td>
                    <span className={`sk-status ${s.status}`}>{STATUS_LABEL[s.status]}</span>
                    {s.revoke_reason && <div className="sk-sub">{s.revoke_reason}</div>}
                    {s.reset_count > 0 && <div className="sk-sub">Liberado {s.reset_count}×</div>}
                  </td>
                  <td className="sk-install" title={s.installation_id || ''}>{s.installation_id || '—'}{s.activated_at && <div className="sk-sub">desde {fmtDate(s.activated_at)}</div>}</td>
                  <td>{fmtDate(s.last_validated_at)}</td>
                  <td className="sk-note" title={s.note || ''}>{s.note || '—'}</td>
                  <td className="sk-row-actions">
                    {s.installation_id && <button className="btn btn-sm btn-outline-warning" onClick={() => resetActivation(s)}>Liberar</button>}
                    {s.status === 'revoked'
                      ? <button className="btn btn-sm btn-outline-secondary" onClick={() => unrevoke(s)}>Quitar revocación</button>
                      : <button className="btn btn-sm btn-outline-danger" onClick={() => revoke(s)}>Revocar</button>}
                  </td>
                </tr>
              ))}
              {!listLoading && list.serials.length === 0 && <tr><td colSpan={8} className="config-empty">Sin seriales.</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="sk-pager">
            <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span>Página {page} de {pages}</span>
            <button className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        )}
      </article>

      <Dialog open={!!generated} onClose={closeGenerated} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#101b2a', color: '#e2e8f0', border: '1px solid rgba(56,189,248,.4)' } }}>
        {generated && (
          <div className="sk-generated">
            <h3>Seriales generados · {generated.product_id}</h3>
            <p className="sk-warning">Cópialos ahora: es la única vez que se muestran.</p>
            <pre className="sk-pem">{generated.serials.map(s => s.serial).join('\n')}</pre>
            <div className="sk-actions">
              <button className="btn btn-sm btn-primary" onClick={() => copy(generated.serials.map(s => s.serial).join('\n'), 'Seriales copiados')}>Copiar todos</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={closeGenerated}>Cerrar</button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
