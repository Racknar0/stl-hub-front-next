'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useStore from '../../../store/useStore';
import './GlobalLoader.scss';

export default function GlobalLoader() {
  const globalLoading = useStore((s) => s.globalLoading);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Bloquear scroll cuando esté activo
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const body = document.body;
    if (globalLoading) {
      const prevHtml = html.style.overflow;
      const prevBody = body.style.overflow;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      return () => { html.style.overflow = prevHtml; body.style.overflow = prevBody; };
    }
  }, [globalLoading, mounted]);

  if (!mounted || !globalLoading) return null;

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

  return createPortal(overlay, document.body);
}
