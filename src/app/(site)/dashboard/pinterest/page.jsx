'use client';
import React from 'react';
import PinterestCalendar from './PinterestCalendar';

export default function PinterestDashboardPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Pinterest Publisher</h1>
        <p style={{ color: '#a1a1aa', marginTop: '0.5rem' }}>Administra y programa la distribución de tus Assets en Pinterest.</p>
      </div>
      <PinterestCalendar />
    </div>
  );
}
