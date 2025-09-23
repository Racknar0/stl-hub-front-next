'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import './Testimonials.scss';
import useStore from '../../../store/useStore';
import { useI18n } from '../../../i18n';

const defaultItems = [
	{
		es: 'Encontré el archivo, lo imprimí esa noche y quedó perfecto a la primera.',
		en: 'Found the file, printed it that night, and it worked first try.',
		name: 'Laura M.',
		role: 'Maker — Home Lab',
	},
	{
		es: 'Los modelos vienen limpios, sin errores de malla. Ahorro horas de reparación.',
		en: 'Models come clean, no mesh errors. Saves me hours of fixing.',
		name: 'Diego R.',
		role: '3D Tech — Freelance',
	},
	{
		es: 'Mis clientes notaron la mejora en calidad. Ya no vuelvo a los repos gratis al azar.',
		en: 'My clients noticed the quality boost. I’m done with random free repos.',
		name: 'Kevin T.',
		role: 'Print Bureau Owner',
	},
	{
		es: 'Los bundles valen cada centavo. Monté una vitrina completa en un fin de semana.',
		en: 'Bundles are worth every penny. Filled a display case in one weekend.',
		name: 'Brenda C.',
		role: 'Collector',
	},
	{
		es: 'La vista previa y las fotos reales ayudan a evitar sorpresas.',
		en: 'Previews and real photos help avoid surprises.',
		name: 'John P.',
		role: 'Cosplay Props',
	},
	{
		es: 'El soporte al cliente responde rápido y con soluciones, no guiones.',
		en: 'Support replies fast with actual solutions, not scripts.',
		name: 'Álvaro D.',
		role: 'Workshop Owner',
	},
	{
		es: 'Los archivos vienen con nombres claros y carpetas ordenadas.',
		en: 'Files come clearly named and well organized.',
		name: 'Pablo F.',
		role: 'QA Technician',
	},
	{
		es: 'Los freebies diarios me tienen volviendo cada mañana.',
		en: 'Daily freebies keep me coming back every morning.',
		name: 'Elise J.',
		role: 'Enthusiast',
	},
	{
		es: 'El soporte respondió en 15 min con un fix de archivo.',
		en: 'Support answered in 15 minutes with a file fix.',
		name: 'Daniel K.',
		role: 'Freelancer',
	},
	{
		es: 'Mis mejores ventas vinieron de packs encontrados aquí.',
		en: 'My best sales came from packs found here.',
		name: 'Gabriel U.',
		role: 'Merchant',
	},
];

const getInitials = (name = '') => {
	const parts = String(name).trim().split(/\s+/).slice(0, 2);
	return parts.map((p) => p[0]?.toUpperCase()).join('');
};

const Testimonials = ({ items = defaultItems }) => {
	const list = Array.isArray(items) && items.length ? items : defaultItems;
	const language = useStore((s) => s.language);
	const isEn = String(language || 'es').toLowerCase() === 'en';
	const { t } = useI18n?.() || { t: () => undefined };
	
	const title = (typeof t === 'function' && t('testimonials.title')) || 
		(isEn ? 'What makers say' : 'Lo que dicen los makers');
	const subtitle = (typeof t === 'function' && t('testimonials.subtitle')) || 
		(isEn ? 'Real opinions from our community' : 'Opiniones reales de nuestra comunidad');

	return (
		<section className="testimonials">
			
			<div className="container-narrow">
				<header className="p-header mb-4">
				<h3>{title}</h3>
				<p>{subtitle}</p>
			</header>
				<Swiper
					modules={[Autoplay]}
					autoplay={{ delay: 3500, disableOnInteraction: false }}
					loop
					slidesPerView={3}
					spaceBetween={16}
					breakpoints={{
						0: { slidesPerView: 1 },
						640: { slidesPerView: 2 },
						1024: { slidesPerView: 3 },
					}}
				>
					{list.map((it, idx) => (
						<SwiperSlide key={idx}>
							<article className="tcard">
								<p className="quote">
									“{isEn ? it.en || it.es : it.es || it.en}”
								</p>
								<div className="meta">
									<div className="avatar" aria-hidden>
										{it.avatar ? (
											<img src={it.avatar} alt={it.name} />
										) : (
											<span>{getInitials(it.name)}</span>
										)}
									</div>
									<div className="id">
										<div className="name">{it.name}</div>
										<div className="role">{it.role}</div>
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

export default Testimonials;
