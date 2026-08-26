import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/privacy-policy', 'Política de privacidad | STL Gratis');

export default function PrivacyPolicyLayout({ children }) {
  return children;
}
