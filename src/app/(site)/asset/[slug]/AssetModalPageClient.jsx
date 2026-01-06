"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AssetModal from '../../../../components/common/AssetModal/AssetModal';

/**
 * Envuelve el AssetModal para reutilizar EXACTAMENTE la misma UI del modal
 * cuando el usuario entra a la ruta /asset/[slug].
 * - Abre el modal automáticamente.
 * - Al cerrar vuelve atrás (history) y si no hay history va al inicio.
 */
export default function AssetModalPageClient({ asset }) {
  const router = useRouter();
  const [open, setOpen] = useState(true); // abierto desde el inicio

  // Cerrar modal: SIEMPRE ir al home.
  // Motivo: si el usuario entra directo desde Google, hacer back puede devolverlo al buscador
  // (o a un historial no deseado). Queremos que cerrar el modal equivalga a "volver al sitio".
  const handleClose = useCallback(() => {
    setOpen(false);
    // Pequeño timeout para permitir animación fade (si existiera)
    setTimeout(() => {
      router.push('/');
    }, 80);
  }, [router]);

  // Si el asset cambia (navegación interna por algún link), reabrir
  useEffect(() => {
    setOpen(true);
  }, [asset?.id]);

  if (!asset) return null;

  return (
    <>
      {/* Mantener un main mínimo para accesibilidad / SEO debajo del modal (hidden) */}
      <main style={{ position: 'relative' }} aria-hidden={open ? 'true' : 'false'}>
        {/* Contenido mínimo para que el documento no quede vacío sin JS */}
        <h1 style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          {asset.title || 'Asset'}
        </h1>
      </main>
      <AssetModal open={open} onClose={handleClose} asset={asset} />
    </>
  );
}
