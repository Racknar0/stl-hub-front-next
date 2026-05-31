import { buildNoindexMetadata } from '../../../../noindexRouteMetadata';

export const metadata = buildNoindexMetadata(
  '/payment/mercadopago/callback',
  'Confirmación de pago | STL HUB'
);

export default function MercadoPagoCallbackLayout({ children }) {
  return children;
}
