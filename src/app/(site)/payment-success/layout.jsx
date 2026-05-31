import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/payment-success', 'Pago exitoso | STL HUB');

export default function PaymentSuccessLayout({ children }) {
  return children;
}
