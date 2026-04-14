"use client";
import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';
import { Dialog, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

export default function ImageLightbox({ images, alt }) {
  const [fullOpen, setFullOpen] = useState(false);
  const [initialSlide, setInitialSlide] = useState(0);

  const openFull = (idx) => {
    setInitialSlide(idx);
    setFullOpen(true);
  };

  return (
    <>
      {/* Thumbnails grid */}
      {images.map((img, i) => (
        <figure
          key={`${img}-${i}`}
          style={{ margin: 0, cursor: 'zoom-in', position: 'relative' }}
          onClick={() => openFull(i)}
        >
          <img
            loading={i === 0 ? 'eager' : 'lazy'}
            src={img}
            alt={`${alt} render ${i + 1}`}
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '1/1',
              objectFit: 'cover',
              borderRadius: 0,
            }}
          />
          {/* Fullscreen icon overlay */}
          <div style={{
            position: 'absolute',
            right: 8,
            bottom: 40,
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            opacity: 0.7,
            transition: 'opacity 0.2s',
            pointerEvents: 'none',
          }}>
            <FullscreenIcon fontSize="small" />
          </div>
          <figcaption style={{
            padding: '10px 12px',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: 'rgba(226, 232, 240, 0.85)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#7c6bff' }} />
            Vista {i + 1}
          </figcaption>
        </figure>
      ))}

      {/* Fullscreen Swiper Dialog – same as AssetModal */}
      <Dialog fullScreen open={fullOpen} onClose={() => setFullOpen(false)}>
        <Box sx={{
          position: 'relative',
          p: 0,
          bgcolor: 'black',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}>
          {/* Close button */}
          <IconButton
            onClick={() => setFullOpen(false)}
            aria-label="Cerrar"
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              zIndex: 3,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.6)',
              width: 56,
              height: 56,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 30 }} />
          </IconButton>

          {/* Swiper with zoom */}
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& .swiper': {
              width: '100vw',
              height: '100vh',
              overflow: 'hidden',
            },
            '& .swiper-wrapper': {
              alignItems: 'center',
            },
            '& .swiper-slide': {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            '& img': {
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            },
          }}>
            <Swiper
              modules={[Navigation, Pagination, Zoom]}
              navigation
              pagination
              loop
              zoom={{ maxRatio: 3 }}
              initialSlide={initialSlide}
            >
              {images.map((src, idx) => (
                <SwiperSlide key={`full-${idx}`}>
                  <div className="swiper-zoom-container">
                    <img src={src} alt={`${alt} ${idx + 1}`} />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
