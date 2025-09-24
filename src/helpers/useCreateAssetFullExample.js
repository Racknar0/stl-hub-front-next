// Ejemplo de hook para usar AssetService.createFull
// Importar en un componente y llamar createAssetFull(formState)
import { useState } from 'react';
import assetService from '../services/AssetService';
import { successAlert } from './alerts';

export function useCreateAssetFull() {
  const [loading, setLoading] = useState(false);

  const createAssetFull = async (values) => {
    setLoading(true);
    try {
      const data = await assetService.createFull(values);
      await successAlert('Asset creado', 'Se ha creado y encolado la subida a MEGA');
      return data;
    } finally {
      setLoading(false);
    }
  };

  return { createAssetFull, loading };
}
