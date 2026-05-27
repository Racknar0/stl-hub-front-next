'use client';

import React from 'react';
import './CardSkeleton.scss';

const CardSkeleton = () => {
  return (
    <div className="card-skeleton" aria-hidden="true">
      <div className="card-skeleton__thumb shimmer" />
      <div className="card-skeleton__info">
        <div className="card-skeleton__title shimmer" />
        <div className="card-skeleton__title-short shimmer" />
        <div className="card-skeleton__chips">
          <div className="card-skeleton__chip shimmer" />
          <div className="card-skeleton__chip shimmer" />
        </div>
        <div className="card-skeleton__meta shimmer" />
      </div>
    </div>
  );
};

export default CardSkeleton;
