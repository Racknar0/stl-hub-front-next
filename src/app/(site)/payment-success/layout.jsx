import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/payment-success', 'Pago exitoso | STL Gratis');

export default function PaymentSuccessLayout({ children }) {
  return children;
}
