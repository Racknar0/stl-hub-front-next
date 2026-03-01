'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { HOME_CARD_IMAGE_SLIDER_ENABLED } from '../../../helpers/featureFlags';
import './CardImageSlider.scss';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

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
  const instanceId = useId().replace(/:/g, '');
  const prefersReducedMotion = usePrefersReducedMotion();
  const isEnabled = (enabled ?? HOME_CARD_IMAGE_SLIDER_ENABLED) && !prefersReducedMotion;

  const list = useMemo(() => normalizeImages(images, fallback), [images, fallback]);

  const [index, setIndex] = useState(0);

  const timerRef = useRef(null);
  const didInitRef = useRef(false);
  const autoplayDelayRef = useRef(getRandInt(MIN_MS, MAX_MS));

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
    // Mantener compatibilidad: limpiar timers anteriores (ya no usamos setTimeout para avanzar)
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return undefined;
  }, [isEnabled, list.length]);

  const src = list[index] || list[0];
  const safeSrc = typeof src === 'string' && src ? encodeURI(src) : '/vite.svg';

  if (!isEnabled || list.length <= 1) {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={`${className} card-image-slider-img`}
        priority={false}
      />
    );
  }

  const prevClass = `card-image-slider__prev-${instanceId}`;
  const nextClass = `card-image-slider__next-${instanceId}`;
  const onNavPointerDown = (e) => {
    // Evita que el click de las flechas dispare el onClick del card.
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="card-image-slider-root" aria-label="Galería de imágenes">
      <Swiper
        className="card-image-slider-swiper"
        modules={[Navigation, Autoplay]}
        navigation={{
          prevEl: `.${prevClass}`,
          nextEl: `.${nextClass}`,
        }}
        autoplay={{
          delay: autoplayDelayRef.current,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        loop
        nested
        speed={520}
        initialSlide={index}
        onSlideChange={(swiper) => setIndex(swiper.realIndex ?? 0)}
      >
        {list.map((imgSrc, idx) => {
          const safe = typeof imgSrc === 'string' && imgSrc ? encodeURI(imgSrc) : safeSrc;
          return (
            <SwiperSlide key={`${idx}-${safe}`}>
              <div className="card-image-slider-slide">
                <Image
                  src={safe}
                  alt={alt}
                  fill
                  sizes={sizes}
                  className={`${className} card-image-slider-img`}
                  priority={false}
                />
              </div>
            </SwiperSlide>
          );
        })}

        <button
          type="button"
          className={`card-image-slider-nav card-image-slider-nav--prev ${prevClass}`}
          aria-label="Imagen anterior"
          onPointerDown={onNavPointerDown}
          onClick={(e) => e.stopPropagation()}
        >
          ‹
        </button>
        <button
          type="button"
          className={`card-image-slider-nav card-image-slider-nav--next ${nextClass}`}
          aria-label="Imagen siguiente"
          onPointerDown={onNavPointerDown}
          onClick={(e) => e.stopPropagation()}
        >
          ›
        </button>
      </Swiper>
    </div>
  );
};

export default CardImageSlider;
