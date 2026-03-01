'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { HOME_CARD_IMAGE_SLIDER_ENABLED } from '../../../helpers/featureFlags';
import './CardImageSlider.scss';

const MIN_MS = 4000;
const MAX_MS = 6000;

const getRandInt = (min, max) => {
  // inclusive
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi <= lo) return lo;

  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      const r = buf[0] / 0xffffffff;
      return lo + Math.floor(r * (hi - lo + 1));
    }
  } catch {
    // ignore
  }

  return lo + Math.floor(Math.random() * (hi - lo + 1));
};

const normalizeImages = (images, fallback) => {
  const list = Array.isArray(images) ? images : [];
  const cleaned = list
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean);

  if (cleaned.length > 0) return cleaned;

  if (typeof fallback === 'string' && fallback.trim()) return [fallback.trim()];

  return ['/vite.svg'];
};

const usePrefersReducedMotion = () => {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefers(!!mql.matches);
    onChange();

    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Safari < 14
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return prefers;
};

const CardImageSlider = ({
  images,
  fallback,
  alt = 'asset',
  enabled,
  sizes,
  className = 'card-image-slider-img',
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isEnabled = (enabled ?? HOME_CARD_IMAGE_SLIDER_ENABLED) && !prefersReducedMotion;

  const list = useMemo(() => normalizeImages(images, fallback), [images, fallback]);

  const [index, setIndex] = useState(0);

  const timerRef = useRef(null);
  const didInitRef = useRef(false);

  // Prefetch: cuando el slider está activo, precargar TODAS las imágenes del card
  useEffect(() => {
    if (!isEnabled) return;
    if (typeof window === 'undefined') return;
    if (list.length <= 1) return;

    const uniq = Array.from(new Set(list));

    try {
      uniq.forEach((src) => {
        const img = new window.Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = src;
      });
    } catch {
      // ignore
    }
  }, [isEnabled, list]);

  // Índice inicial / reseteo (solo aleatorio cuando el slider está activo)
  useEffect(() => {
    if (!isEnabled) {
      didInitRef.current = false;
      setIndex(0);
      return;
    }

    if (list.length <= 1) {
      didInitRef.current = true;
      setIndex(0);
      return;
    }

    if (!didInitRef.current) {
      didInitRef.current = true;
      setIndex(getRandInt(0, list.length - 1));
      return;
    }

    setIndex((prev) => (prev >= 0 && prev < list.length ? prev : 0));
  }, [isEnabled, list.length]);

  useEffect(() => {
    if (!isEnabled) return;
    if (list.length <= 1) return;

    const schedule = () => {
      const delay = getRandInt(MIN_MS, MAX_MS);
      timerRef.current = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % list.length);
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isEnabled, list.length]);

  const src = list[index] || list[0];
  const safeSrc = typeof src === 'string' && src ? encodeURI(src) : '/vite.svg';

  return (
    <Image
      src={safeSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={`${className} card-image-slider ${isEnabled ? 'card-image-slider--enabled' : ''}`}
      priority={false}
    />
  );
};

export default CardImageSlider;
