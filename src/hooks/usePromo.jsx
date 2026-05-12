'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import HttpService from '@/services/HttpService';

const PromoContext = createContext({ active: false, daysLeft: null, loading: true });

export function PromoProvider({ children }) {
  const [promo, setPromo] = useState({ active: false, daysLeft: null, loading: true });

  useEffect(() => {
    const http = new HttpService();
    http.getData('/promo/status')
      .then((res) => {
        if (res?.data) setPromo({ ...res.data, loading: false });
        else setPromo((p) => ({ ...p, loading: false }));
      })
      .catch(() => {
        setPromo((p) => ({ ...p, loading: false }));
      });
  }, []);

  return (
    <PromoContext.Provider value={promo}>
      {children}
    </PromoContext.Provider>
  );
}

export function usePromo() {
  return useContext(PromoContext);
}
