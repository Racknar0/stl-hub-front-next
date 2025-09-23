'use client';
import React from 'react';
import SimplyModal from '../SimplyModal/SimplyModal';
import Button from '../../layout/Buttons/Button';
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';

export default function ReportBrokenModal({ open, onClose, assetId, assetTitle, onSubmitted }) {
  const http = new HttpService();
  const language = useStore((s)=>s.language);
  const isEn = String(language || 'es').toLowerCase() === 'en';

  const [note, setNote] = React.useState('');
  const [captchaOk, setCaptchaOk] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setNote('');
      setCaptchaOk(false);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!assetId || submitting || !captchaOk) return;
    try {
      setSubmitting(true);
      await http.postData(`/assets/${assetId}/report-broken-link`, {
        note: String(note || '').slice(0, 1000),
        // captchaToken: '', // TODO: integrar reCAPTCHA/turnstile aquí
      });
      onSubmitted?.();
    } catch {
      window.alert(isEn ? 'Could not send the report. Try later.' : 'No se pudo enviar el reporte. Intenta más tarde.');
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

      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto .75rem' }}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isEn ? 'Optional comments...' : 'Comentarios opcionales...'}
          rows={4}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,.06)',
            color: '#e9efff',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 12,
            padding: '10px 12px',
            resize: 'vertical',
            outline: 'none'
          }}
        />
      </div>

      {/* Captcha placeholder */}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '.9rem', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={captchaOk}
          onChange={(e) => setCaptchaOk(e.target.checked)}
        />
        <span>{isEn ? "I'm not a robot (placeholder)" : 'No soy un robot (placeholder)'}</span>
      </label>

      <div className="actions center" style={{ justifyContent: 'center' }}>
        <Button
          onClick={handleSubmit}
          disabled={!captchaOk || submitting || !assetId}
          variant="purple"
          className="btn-big"
        >
          {submitting ? (isEn ? 'Sending...' : 'Enviando...') : (isEn ? 'Send' : 'Enviar')}
        </Button>
      </div>
    </SimplyModal>
  );
}

