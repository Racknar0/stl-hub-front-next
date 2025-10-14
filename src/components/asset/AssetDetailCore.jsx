"use client";
import React, { useMemo } from 'react';
import HttpService from '../../services/HttpService';
import Button from '../layout/Buttons/Button';
import { useI18n } from '../../i18n';
import useStore from '../../store/useStore';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';

// Componente reutilizable que representa el cuerpo del modal en vista standalone
export default function AssetDetailCore({ asset }) {
  const { t } = useI18n();
  const language = useStore(s => s.language);
  const isEn = String(language||'es').toLowerCase() === 'en';
  if (!asset) return null;

  const title = isEn ? (asset.titleEn || asset.title) : (asset.title || asset.titleEn);
  const tags = isEn ? (asset.tagsEn || asset.tagsEs || []) : (asset.tagsEs || asset.tagsEn || []);
  const images = Array.isArray(asset.images) ? asset.images : [];
  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const imgUrl = (rel) => {
    if (!rel) return ''; const s = String(rel).trim();
    if (/^https?:\/\//i.test(s)) return s; return `${UPLOAD_BASE}/${s.replace(/\\/g,'/').replace(/^\/+/,'')}`;
  };

  return (
    <div className="asset-detail-core">
      <div className="gallery">
        <Swiper modules={[Navigation, Pagination, Zoom]} navigation pagination={{ clickable: true }} zoom className="asset-swiper">
          {(images.length?images:['/vite.svg']).map((src,i)=>(
            <SwiperSlide key={i}>
              <div className="img-wrapper" style={{position:'relative', width:'100%', aspectRatio:'4/3', overflow:'hidden'}}>
                <img src={imgUrl(src)} alt={title} style={{objectFit:'cover', width:'100%', height:'100%'}} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="detail-body">
        <h1 className="asset-title">{title}</h1>
        <div className="meta-line">
          <span className="date">{asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('es-ES',{ day:'2-digit', month:'short', year:'numeric'}) : null}</span>
          {asset.downloads != null && <span className="downloads">{asset.downloads} descargas</span>}
          {asset.isPremium && <span className="premium-badge">Premium</span>}
        </div>
        {!!tags?.length && (
          <div className="tags">
            {tags.slice(0,12).map((t,i)=>(
              <Link key={i} href={`/search?tags=${encodeURIComponent(t)}`} className="tag-link">#{t}</Link>
            ))}
          </div>
        )}
        {asset.description && <p className="description">{asset.description}</p>}
        <div className="cta-block" style={{marginTop:'1rem'}}>
          <Button variant="purple" styles={{width:'220px',height:'48px'}} href={`/search?related=${asset.slug}`}>Buscar similares</Button>
        </div>
      </div>
    </div>
  );
}
