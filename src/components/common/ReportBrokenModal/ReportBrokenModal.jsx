'use client';
import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import SimplyModal from '../SimplyModal/SimplyModal';
import Button from '../../layout/Buttons/Button';
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';

export default function ReportBrokenModal({ open, onClose, assetId, assetTitle, onSubmitted }) {
  const http = new HttpService();
  const language = useStore((s)=>s.language);
  const isEn = String(language || 'es').toLowerCase() === 'en';

  const [note, setNote] = React.useState('');
  const [captchaToken, setCaptchaToken] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState('idle'); // idle | success | error

  React.useEffect(() => {
    if (!open) {
      setNote('');
      setCaptchaToken('');
      setSubmitting(false);
      setStatus('idle');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!assetId || submitting || !captchaToken) return;
    try {
      setSubmitting(true);
      await http.postData(`/assets/${assetId}/report-broken-link`, {
        note: String(note || '').slice(0, 1000),
        captchaToken
      });
      setStatus('success');
      try { onSubmitted?.('success'); } catch {}
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimplyModal open={open} onClose={onClose}>
      <div aria-hidden className="lead-emoji" style={{ fontSize: '2rem', marginBottom: '.35rem' }}>🚩</div>
      <h3 className="title" style={{ marginBottom: '.25rem' }}>
        {isEn ? 'Report broken link' : 'Reportar link caído'}
      </h3>
      <p style={{ marginBottom: '.75rem', opacity: .9 }}>
        {isEn ? 'Tell us what went wrong so we can fix it.' : `Cuéntanos qué falló para poder revisarlo. (${assetTitle || 'Asset'})`}
      </p>

      {status !== 'success' && (
        <div style={{ width: '100%', maxWidth: 520, margin: '0 auto .75rem' }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isEn ? 'Optional comments...' : 'Comentarios opcionales...'}
            rows={4}
            disabled={submitting}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,.06)',
              color: '#e9efff',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 12,
              padding: '10px 12px',
              resize: 'vertical',
              outline: 'none',
              opacity: submitting ? .7 : 1
            }}
          />
        </div>
      )}

      {status !== 'success' && (
        <div style={{ marginBottom: '.9rem', display: 'flex', justifyContent: 'center' }}>
          <ReCAPTCHA
            sitekey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY}
            onChange={setCaptchaToken}
            theme="dark"
            size="normal"
            style={{ margin: '0 auto' }}
          />
        </div>
      )}

      {status === 'idle' && (
        <div className="actions center" style={{ justifyContent: 'center' }}>
          <Button
            onClick={handleSubmit}
            disabled={!captchaToken || submitting || !assetId}
            variant="purple"
            className="btn-big"
          >
            {submitting && <span className="btn-spinner" aria-hidden />}
            {submitting ? (isEn ? 'Sending...' : 'Enviando...') : (isEn ? 'Send' : 'Enviar')}
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ff8a8a', marginBottom: '.75rem' }}>
            {isEn ? 'Could not send the report. Try later.' : 'No se pudo enviar el reporte. Intenta más tarde.'}
          </div>
          <div className="actions center" style={{ justifyContent: 'center' }}>
            <Button onClick={handleSubmit} disabled={!captchaOk || submitting || !assetId} variant="purple" className="btn-big">
              {submitting && <span className="btn-spinner" aria-hidden />}
              {submitting ? (isEn ? 'Sending...' : 'Enviando...') : (isEn ? 'Retry' : 'Reintentar')}
            </Button>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div style={{ textAlign: 'center' }}>
          <div aria-hidden style={{ fontSize: '2rem', marginBottom: '.25rem' }}>✅</div>
          <p style={{ marginBottom: '1rem' }}>{isEn ? 'Thanks for your report!' : '¡Gracias por tu reporte!'}</p>
          <div className="actions center" style={{ justifyContent: 'center' }}>
            <Button onClick={onClose} variant="purple" className="btn-big">
              {isEn ? 'Close' : 'Cerrar'}
            </Button>
          </div>
        </div>
      )}
    </SimplyModal>
  );
}

