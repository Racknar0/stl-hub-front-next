'use client';

import React from 'react';
import './SectionRow.scss';
import Button from '../../layout/Buttons/Button';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useI18n } from '../../../i18n';

const SectionRow = ({ title, linkLabel, linkHref, items = [], onItemClick }) => {
  const { t } = useI18n();
  const finalLinkLabel = linkLabel || t('sliders.row.more');
  return (
    <section className="section-row">
      <div className="container-narrow">
        <div className="header">
          <h3>{title}</h3>
          {/* Botón Ver más opcional */}
          {linkHref ? (
            <Button variant="cyan" as="a" href={linkHref} styles={{ width: '140px', color: '#fff' }}>
              {finalLinkLabel}
            </Button>
          ) : null}
        </div>

        <Swiper
          className="row-slider"
          modules={[Navigation]}
          navigation
          slidesPerView="auto"
          spaceBetween={16}
          grabCursor
          watchOverflow
        >
          {items.map((it) => (
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
                      <a
                        className="chip chip--link"
                        key={idx}
                        href={`/search?tags=${encodeURIComponent((it.tagSlugs||[])[idx] ?? c)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{c}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default SectionRow;
