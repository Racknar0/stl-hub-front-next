'use client';

import React from 'react';
import './SectionRow.scss';
import Button from '../../layout/Buttons/Button';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useI18n } from '../../../i18n';
import Link from 'next/link';
import '../../common/GlobalLoader/GlobalLoader.scss';

const SectionRow = ({ title, linkLabel, linkHref, items = [], onItemClick, loading = false }) => {
  const { t } = useI18n();
  const finalLinkLabel = linkLabel || t('sliders.row.more');
  const Spinner = ({ size = 36 }) => (
    <div className="sk-circle" style={{ width: size, height: size }}>
      <div className="sk-circle1 sk-child" />
      <div className="sk-circle2 sk-child" />
      <div className="sk-circle3 sk-child" />
      <div className="sk-circle4 sk-child" />
      <div className="sk-circle5 sk-child" />
      <div className="sk-circle6 sk-child" />
      <div className="sk-circle7 sk-child" />
      <div className="sk-circle8 sk-child" />
      <div className="sk-circle9 sk-child" />
      <div className="sk-circle10 sk-child" />
      <div className="sk-circle11 sk-child" />
      <div className="sk-circle12 sk-child" />
    </div>
  );
  const showLoader = loading || !Array.isArray(items) || items.length === 0;
  return (
    <section className="section-row">
      <div className="container-narrow">
        <div className="header">
          <h3>{title}</h3>
          {/* Botón Ver más opcional */}
          {linkHref ? (
            <Button variant="cyan" href={linkHref} styles={{ width: '140px', color: '#fff' }}>
              {finalLinkLabel}
            </Button>
          ) : null}
        </div>
        {showLoader ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <Spinner size={36} />
          </div>
        ) : (
          <Swiper
            className="row-slider"
            modules={[Navigation]}
            navigation
            slidesPerView="auto"
            spaceBetween={16}
            grabCursor
            watchOverflow
          >
            {items.map((it) => {
              const formatUploadDate = (raw) => {
                if (!raw) return null;
                const d = new Date(raw);
                if (isNaN(d.getTime())) return null;
                const dd = String(d.getDate()).padStart(2, '0');
                const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                const mmm = months[d.getMonth()];
                const yyyy = d.getFullYear();
                return `${dd}-${mmm}-${yyyy}`;
              };
              const uploadDate = formatUploadDate(it.createdAt);
              return (
                <SwiperSlide key={it.id}>
                  <article className="card-item" onClick={() => onItemClick?.(it)}>
                    <div
                      className="thumb"
                      style={{ backgroundImage: `url(${it.thumb})` }}
                    />
                    <div className="info">
                      {/* it.title ya viene en el idioma derivado por Home */}
                      <div className="title">{it.title || '-'}</div>
                      <div className="chips">
                        {it.chips?.map((c, idx) => (
                          <Link
                            className="chip chip--link"
                            key={idx}
                            href={`/search?tags=${encodeURIComponent((it.tagSlugs||[])[idx] ?? c)}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{c}
                          </Link>
                        ))}
                      </div>
                      {uploadDate && (
                        <div className="fmeta">upload: {uploadDate}</div>
                      )}
                    </div>
                  </article>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </div>
    </section>
  );
};

export default SectionRow;
