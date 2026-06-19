'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { HOME_CARD_IMAGE_SLIDER_ENABLED } from '../../../helpers/featureFlags';
import { useNSFW } from '../../../hooks/useNSFW';
import './CardImageSlider.scss';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';


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
  isAdult = false,
  priority = false,
}) => {
  const instanceId = useId().replace(/:/g, '');
  const prefersReducedMotion = usePrefersReducedMotion();
  const isEnabled = (enabled ?? HOME_CARD_IMAGE_SLIDER_ENABLED) && !prefersReducedMotion;
  const { isConfirmed } = useNSFW();
  const applyBlur = isAdult && !isConfirmed;

  const list = useMemo(() => normalizeImages(images, fallback), [images, fallback]);

  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Prefetch: cuando el slider está activo y el usuario hace hover, precargar las imágenes del card
  useEffect(() => {
    if (!isEnabled || !isHovered) return;
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
  }, [isEnabled, isHovered, list]);

  // Índice inicial / reseteo
  useEffect(() => {
    if (!isEnabled || list.length <= 1) {
      setIndex(0);
      return;
    }
    setIndex((prev) => (prev >= 0 && prev < list.length ? prev : 0));
  }, [isEnabled, list.length]);

  const src = list[index] || list[0];
  const safeSrc = typeof src === 'string' && src ? encodeURI(src) : '/vite.svg';

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIndex(0);
  };

  if (!isEnabled || list.length <= 1 || !isHovered) {
    return (
      <div 
        className="card-image-slider-root single-image" 
        aria-label="Imagen"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {!applyBlur && (
          <Image
            src={safeSrc}
            alt=""
            fill
            sizes="10px"
            className="card-image-slider-bg-blur"
            priority={false}
          />
        )}
        <Image
          src={safeSrc}
          alt={alt}
          fill
          sizes={sizes}
          className={`${className} ${applyBlur ? 'card-image-slider-img nsfw-blur' : 'card-image-slider-img-contain'}`}
          priority={priority}
        />
        {applyBlur && (
          <div className="nsfw-badge">
            <span className="nsfw-icon">🔞</span> NSFW
          </div>
        )}
      </div>
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
    <div 
      className="card-image-slider-root" 
      aria-label="Galería de imágenes"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Swiper
        className="card-image-slider-swiper"
        modules={[Navigation, Autoplay]}
        navigation={{
          prevEl: `.${prevClass}`,
          nextEl: `.${nextClass}`,
        }}
        autoplay={{
          delay: 1800,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
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
                {!applyBlur && (
                  <Image
                    src={safe}
                    alt=""
                    fill
                    sizes="10px"
                    className="card-image-slider-bg-blur"
                    priority={false}
                  />
                )}
                <Image
                  src={safe}
                  alt={alt}
                  fill
                  sizes={sizes}
                  className={`${className} ${applyBlur ? 'card-image-slider-img nsfw-blur' : 'card-image-slider-img-contain'}`}
                  priority={priority}
                />
              </div>
            </SwiperSlide>
          );
        })}

        {applyBlur && (
          <div className="nsfw-badge">
            <span className="nsfw-icon">🔞</span> NSFW
          </div>
        )}

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
