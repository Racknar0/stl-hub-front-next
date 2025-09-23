'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useStore from '../../../store/useStore';
import './GlobalLoader.scss';

export default function GlobalLoader({ active: activeProp }) {
  const globalLoading = useStore((s) => s.globalLoading);
  const active = typeof activeProp === 'boolean' ? activeProp : globalLoading;
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Bloquear scroll cuando esté activo (sólo tras montar)
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const body = document.body;
    if (active) {
      const prevHtml = html.style.overflow;
      const prevBody = body.style.overflow;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      return () => { html.style.overflow = prevHtml; body.style.overflow = prevBody; };
    }
  }, [active, mounted]);

  if (!active) return null;

  const overlay = (
    <div className="global-loader-overlay" role="alert" aria-busy="true" aria-live="polite">
      <div className="sk-circle">
        <div className="sk-circle1 sk-child"></div>
        <div className="sk-circle2 sk-child"></div>
        <div className="sk-circle3 sk-child"></div>
        <div className="sk-circle4 sk-child"></div>
        <div className="sk-circle5 sk-child"></div>
        <div className="sk-circle6 sk-child"></div>
        <div className="sk-circle7 sk-child"></div>
        <div className="sk-circle8 sk-child"></div>
        <div className="sk-circle9 sk-child"></div>
        <div className="sk-circle10 sk-child"></div>
        <div className="sk-circle11 sk-child"></div>
        <div className="sk-circle12 sk-child"></div>
      </div>
    </div>
  );

  // Antes de montar, devolver overlay inline (sin portal) para cubrir el primer paint
  if (!mounted) return overlay;

  // Tras montar, usar portal al body
  return createPortal(overlay, document.body);
}
