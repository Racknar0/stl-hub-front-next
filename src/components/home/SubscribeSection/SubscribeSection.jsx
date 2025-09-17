import React from 'react';
import './SubscribeSection.scss';
import Button from '../../layout/Buttons/Button';

const SubscribeSection = () => {
  return (
    <section className="subscribe-section">
      <div className="container-narrow">
        <div className="box">
          <div className="msg">¿Listo para más? Obtén acceso completo a colecciones premium.</div>
          <Button variant="purple" styles={{ width: '180px', height: '46px' }}>Suscríbete</Button>
        </div>
      </div>
    </section>
  );
};

export default SubscribeSection;
