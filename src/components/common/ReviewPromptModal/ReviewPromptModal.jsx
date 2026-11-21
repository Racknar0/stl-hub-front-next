'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { createMyReview } from '../../../services/ReviewService';
import './ReviewPromptModal.scss';

const RATING_LABELS = {
  es: ['', 'Mala', 'Regular', 'Buena', 'Muy buena', '¡Excelente!'],
  en: ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent!'],
};

// Modal que pide la opinión sobre la web tras unas descargas. La opinión queda pendiente de aprobación.
export default function ReviewPromptModal({ open, onClose, onSubmitted, isEn = false }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(-1);
  const [text, setText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) { setError(''); setDone(false); }
  }, [open]);

  const lang = isEn ? 'en' : 'es';
  const shownRating = hover !== -1 ? hover : rating;
  const canSend = rating > 0 && displayName.trim().length >= 2 && !sending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      await createMyReview({ rating, text, displayName, consent, language: lang });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'ALREADY_REVIEWED') { setDone(true); onSubmitted?.(); return; }
      setError(isEn ? 'We could not send your review. Please try again.' : 'No pudimos enviar tu opinión. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="xs" fullWidth className="review-prompt-modal" aria-labelledby="review-prompt-title">
      <div className="review-prompt-modal__content">
        <div className="review-prompt-modal__top">
          <span className="review-prompt-modal__brand">STL Hub</span>
          <IconButton size="small" onClick={onClose} disabled={sending} aria-label={isEn ? 'Close' : 'Cerrar'}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        {done ? (
          <div className="review-prompt-modal__done">
            <div className="review-prompt-modal__done-icon" aria-hidden>💜</div>
            <h2 id="review-prompt-title">{isEn ? 'Thank you!' : '¡Gracias!'}</h2>
            <p>{isEn ? 'We will review it shortly before publishing it.' : 'La revisaremos en breve antes de publicarla.'}</p>
            <button type="button" className="review-prompt-modal__btn" onClick={onClose}>{isEn ? 'Close' : 'Cerrar'}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 id="review-prompt-title">{isEn ? 'How do you like STL Hub?' : '¿Qué te está pareciendo STL Hub?'}</h2>
            <p className="review-prompt-modal__subtitle">
              {isEn ? 'It takes 10 seconds and helps other makers find us.' : 'Te toma 10 segundos y ayuda a otros makers a encontrarnos.'}
            </p>

            <div className="review-prompt-modal__stars">
              <Rating
                name="site-review-rating"
                value={rating}
                size="large"
                onChange={(_, v) => setRating(v || 0)}
                onChangeActive={(_, v) => setHover(v)}
              />
              <span className="review-prompt-modal__rating-label">{RATING_LABELS[lang][shownRating] || ''}</span>
            </div>

            <TextField
              label={isEn ? 'Tell us more (optional)' : 'Cuéntanos más (opcional)'}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              multiline
              minRows={3}
              fullWidth
              size="small"
              helperText={`${text.length}/280`}
              className="review-prompt-modal__field"
            />
            <TextField
              label={isEn ? 'Name to display' : 'Nombre a mostrar'}
              placeholder={isEn ? 'e.g. Laura M.' : 'p. ej. Laura M.'}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
              fullWidth
              size="small"
              required
              className="review-prompt-modal__field"
            />
            <FormControlLabel
              className="review-prompt-modal__consent"
              control={<Checkbox size="small" checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
              label={isEn ? 'I agree that my review may be published on the website' : 'Acepto que mi opinión se publique en la web'}
            />

            {error && <p className="review-prompt-modal__error" role="alert">{error}</p>}

            <button type="submit" className="review-prompt-modal__btn" disabled={!canSend}>
              {sending ? <CircularProgress size={18} color="inherit" /> : (isEn ? 'Send review' : 'Enviar opinión')}
            </button>
            <button type="button" className="review-prompt-modal__later" onClick={onClose} disabled={sending}>
              {isEn ? 'Maybe later' : 'Ahora no'}
            </button>
          </form>
        )}
      </div>
    </Dialog>
  );
}
