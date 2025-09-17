'use client';

import React from 'react';
import './Testimonials.scss';

const TESTIMONIALS = [
	{
		id: 1,
		quote: 'Encontré modelos increíbles y listos para imprimir. La calidad es top! 💯',
		author: 'María P.',
		role: 'Makers Lab',
		avatar: 'https://i.pravatar.cc/80?img=5',
	},
	{
		id: 2,
		quote: 'La curaduría ahorra tiempo. En minutos tienes 3 opciones buenísimas.',
		author: 'Jorge R.',
		role: '3D Print Co.',
		avatar: 'https://i.pravatar.cc/80?img=12',
	},
	{
		id: 3,
		quote: 'Me encanta la UI y los filtros. Ya es parte de mi flujo de trabajo.',
		author: 'Ana G.',
		role: 'Freelance',
		avatar: 'https://i.pravatar.cc/80?img=32',
	},
];

const Testimonials = () => {
	return (
		<section className="testimonials">
			<div className="container-narrow">
				<div className="t-header">
					<h3>Lo que dicen los makers</h3>
					<p>Opiniones reales de nuestra comunidad</p>
				</div>

				<div className="t-grid">
					{TESTIMONIALS.map(t => (
						<article key={t.id} className="t-card">
							<div className="t-quote">“{t.quote}”</div>
							<div className="t-user">
								<img className="t-avatar" src={t.avatar} alt="" />
								<div>
									<div className="t-name">{t.author}</div>
									<div className="t-role">{t.role}</div>
								</div>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
};

export default Testimonials;
