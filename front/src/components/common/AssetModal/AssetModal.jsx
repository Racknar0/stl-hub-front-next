import React, { useEffect, useMemo, useState } from 'react';
import './AssetModal.css';

export default function AssetModal({ isOpen, onClose, item, language = 'es' }) {
  const [displayCategories, setDisplayCategories] = useState([]);

  useEffect(() => {
    if (item && item.categories) {
      setDisplayCategories(item.categories);
    }
  }, [item]);

  const catHref = (c) => {
    if (!c) return '#';
    const s = typeof c === 'string' ? c : (language === 'en' ? c.slugEn || c.slug : c.slug || c.slugEn);
    return `/search?categories=${encodeURIComponent(s || '')}`;
  };

  return (
    <div className={`asset-modal ${isOpen ? 'open' : ''}`}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2 className="title">{item?.title}</h2>
        <div className="meta-block">
          <div className="meta-title">{language === 'en' ? 'Categories' : 'Categorías'}</div>
          <div className="chips">
            {(displayCategories && displayCategories.length > 0) ? (
              displayCategories.map((c) => (
                <a key={c.id || (c.slug || c.slugEn || c.name)} href={catHref(c)} className="chip">
                  {language === 'en' ? (c.nameEn || c.name) : (c.name || c.nameEn)}
                </a>
              ))
            ) : (
              <span className="chip disabled">{language === 'en' ? 'Uncategorized' : 'Sin categoría'}</span>
            )}
          </div>
        </div>
        <div className="description">{item?.description}</div>
      </div>
    </div>
  );
}