"use client";
import React, { useState } from 'react';
import SectionRow from '../../../../components/home/SectionRow/SectionRow';
import AssetModal from '../../../../components/common/AssetModal/AssetModal';

export default function RelatedAssetsClient({ relatedCats, relatedTags, isEn }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAsset, setModalAsset] = useState(null);

    const handleItemClick = (it) => {
        setModalAsset(it);
        setModalOpen(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', width: '100%', overflow: 'hidden' }}>
            {relatedCats.length > 0 && (
                <SectionRow
                    title={isEn ? 'Related by Category' : 'Similares por Categoría'}
                    items={relatedCats}
                    variantClass="dark-row"
                    onItemClick={handleItemClick}
                />
            )}
            {relatedTags.length > 0 && (
                <SectionRow
                    title={isEn ? 'Related by Tags' : 'Relacionados por Tags'}
                    items={relatedTags}
                    variantClass="dark-row"
                    onItemClick={handleItemClick}
                />
            )}
            <AssetModal 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                asset={modalAsset} 
            />
        </div>
    );
}
