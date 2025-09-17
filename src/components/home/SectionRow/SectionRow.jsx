'use client';

import React from 'react';
import './SectionRow.scss';
import Button from '../../layout/Buttons/Button';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

const SectionRow = ({ title, linkLabel = 'Ver todo', items = [] }) => {
  return (
    <section className="section-row">
      <div className="container-narrow">
        <div className="header">
          <h3>{title}</h3>
          <Button variant="cyan" as="a" href="#" styles={{ width: '110px', color: '#fff' }}>
            {linkLabel}
          </Button>
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
              <article className="card-item">
                <div
                  className="thumb"
                  style={{ backgroundImage: `url(${it.thumb})` }}
                />
                <div className="info">
                  <div className="title">{it.title}</div>
                  <div className="chips">
                    {it.chips?.map((c, idx) => (
                      <span className="chip" key={idx}>{c}</span>
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
