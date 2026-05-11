'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import HttpService from '@/services/HttpService';

const PromoContext = createContext({ active: false, daysLeft: null });

export function PromoProvider({ children }) {
  const [promo, setPromo] = useState({ active: false, daysLeft: null });

  useEffect(() => {
    const http = new HttpService();
    http.getData('/promo/status')
      .then((res) => {
        if (res?.data) setPromo(res.data);
      })
      .catch(() => {});
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
