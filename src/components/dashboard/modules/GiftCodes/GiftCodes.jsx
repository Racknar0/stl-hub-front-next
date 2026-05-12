'use client';
import React, { useState, useEffect, useRef } from 'react';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts';
import './GiftCodes.scss';

const DOMAIN = 'https://stl-hub.com';

export default function GiftCodes() {
  const http = new HttpService();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const copyTimer = useRef(null);

  // Form state
  const [form, setForm] = useState({
    code: '',
    days: 3,
    maxUses: 1,
    expiresAt: '',
    note: '',
    autoGenerate: true,
  });

  const loadCodes = async () => {
    try {
      setLoading(true);
      const res = await http.getData('/admin/gift-codes');
      setCodes(Array.isArray(res?.data?.items) ? res.data.items : []);
    } catch (e) {
      console.error('Error loading gift codes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCodes(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.days || Number(form.days) <= 0) {
      await errorAlert('Error', 'Days must be greater than 0');
      return;
    }
    if (!form.autoGenerate && !form.code.trim()) {
      await errorAlert('Error', 'Enter a code or enable auto-generate');
      return;
    }

    try {
      setSaving(true);
      await http.postData('/admin/gift-codes', {
        code: form.autoGenerate ? '' : form.code.trim(),
        days: Number(form.days),
        maxUses: Number(form.maxUses) || 1,
        expiresAt: form.expiresAt || null,
        note: form.note || null,
      });
      await successAlert('Created!', 'Gift code created successfully');
      setForm({ code: '', days: 3, maxUses: 1, expiresAt: '', note: '', autoGenerate: true });
      await loadCodes();
    } catch (e) {
      await errorAlert('Error', e?.response?.data?.message || 'Could not create code');
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (item) => {
    try {
      await http.patchData('/admin/gift-codes', item.id, { isActive: !item.isActive });
      await loadCodes();
    } catch (e) {
      await errorAlert('Error', e?.response?.data?.message || 'Could not update');
    }
  };

  const onDelete = async (item) => {
    const ok = await confirmAlert(
      'Delete code',
      `Are you sure you want to delete "${item.code}"? This will also delete all redemption records.`,
      'Delete', 'Cancel', 'warning'
    );
    if (!ok) return;
    try {
      await http.deleteData('/admin/gift-codes', item.id);
      await successAlert('Deleted', 'Code deleted successfully');
      await loadCodes();
    } catch (e) {
      await errorAlert('Error', e?.response?.data?.message || 'Could not delete');
    }
  };

  const copyUrl = async (code) => {
    const url = `${DOMAIN}/register?code=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(code);
    } catch {
      setCopyFeedback(null);
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyFeedback(null), 2000);
  };

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const getStatus = (item) => {
    if (!item.isActive) return { label: 'Inactive', cls: 'is-inactive' };
    if (item.expiresAt && new Date() > new Date(item.expiresAt)) return { label: 'Expired', cls: 'is-expired' };
    if (item.usedCount >= item.maxUses) return { label: 'Used up', cls: 'is-used' };
    return { label: 'Active', cls: 'is-active' };
  };

  return (
    <div className="gift-codes-module">
      {/* ─── Create Form ─── */}
      <section className="gc-card gc-create">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Create Gift Code
        </h3>
        <form onSubmit={onSubmit} className="gc-form">
          <div className="gc-form-row">
            <label className="gc-toggle-label">
              <input
                type="checkbox"
                checked={form.autoGenerate}
                onChange={(e) => setForm((v) => ({ ...v, autoGenerate: e.target.checked, code: '' }))}
              />
              Auto-generate code
            </label>
          </div>

          {!form.autoGenerate && (
            <label className="gc-field">
              <span>Code</span>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((v) => ({ ...v, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. TIKTOK3DIAS"
                maxLength={30}
              />
            </label>
          )}

          <div className="gc-form-row gc-form-row-2col">
            <label className="gc-field">
              <span>Premium days</span>
              <input
                type="number"
                min={1}
                max={365}
                value={form.days}
                onChange={(e) => setForm((v) => ({ ...v, days: e.target.value }))}
                required
              />
            </label>
            <label className="gc-field">
              <span>Max uses</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={form.maxUses}
                onChange={(e) => setForm((v) => ({ ...v, maxUses: e.target.value }))}
              />
            </label>
          </div>

          <div className="gc-form-row gc-form-row-2col">
            <label className="gc-field">
              <span>Expires at (optional)</span>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((v) => ({ ...v, expiresAt: e.target.value }))}
              />
            </label>
            <label className="gc-field">
              <span>Note (optional)</span>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((v) => ({ ...v, note: e.target.value }))}
                placeholder="e.g. TikTok campaign May"
              />
            </label>
          </div>

          <button className="gc-submit" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Gift Code'}
          </button>
        </form>
      </section>

      {/* ─── Codes List ─── */}
      <section className="gc-card gc-list">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Gift Codes ({codes.length})
        </h3>

        {loading && <p className="gc-loading">Loading...</p>}
        {!loading && codes.length === 0 && <p className="gc-empty">No gift codes yet. Create one above!</p>}

        {!loading && codes.length > 0 && (
          <div className="gc-table-wrap">
            <table className="gc-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Days</th>
                  <th>Uses</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>URL</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((item) => {
                  const status = getStatus(item);
                  return (
                    <tr key={item.id}>
                      <td className="gc-code-cell">
                        <code>{item.code}</code>
                      </td>
                      <td>{item.days}d</td>
                      <td>
                        <span className={item.usedCount >= item.maxUses ? 'gc-uses-full' : ''}>
                          {item.usedCount}/{item.maxUses}
                        </span>
                      </td>
                      <td>
                        {item.expiresAt
                          ? new Date(item.expiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '∞'}
                      </td>
                      <td>
                        <span className={`gc-status ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="gc-note-cell">{item.note || '-'}</td>
                      <td>
                        <button
                          className={`gc-copy-btn ${copyFeedback === item.code ? 'copied' : ''}`}
                          onClick={() => copyUrl(item.code)}
                          title={`${DOMAIN}/register?code=${item.code}`}
                        >
                          {copyFeedback === item.code ? '✓ Copied' : 'Copy URL'}
                        </button>
                      </td>
                      <td className="gc-actions-cell">
                        <button
                          className={`gc-toggle-btn ${item.isActive ? 'is-on' : 'is-off'}`}
                          onClick={() => onToggle(item)}
                          title={item.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {item.isActive ? 'ON' : 'OFF'}
                        </button>
                        <button className="gc-delete-btn" onClick={() => onDelete(item)} title="Delete">
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Redemption details expandable */}
        {!loading && codes.filter((c) => c.redemptions?.length > 0).length > 0 && (
          <details className="gc-redemptions-block">
            <summary>Recent redemptions</summary>
            <div className="gc-redemptions-list">
              {codes
                .filter((c) => c.redemptions?.length > 0)
                .flatMap((c) =>
                  c.redemptions.map((r) => ({
                    ...r,
                    codeName: c.code,
                  }))
                )
                .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt))
                .slice(0, 20)
                .map((r) => (
                  <div key={r.id} className="gc-redemption-row">
                    <code>{r.codeName}</code>
                    <span>{r.user?.email || `User #${r.userId}`}</span>
                    <span>{r.daysGiven}d</span>
                    <span>{new Date(r.redeemedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
