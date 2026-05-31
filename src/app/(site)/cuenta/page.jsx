import { redirect } from 'next/navigation';
import { buildNoindexMetadata } from '../noindexRouteMetadata';

export const metadata = buildNoindexMetadata('/account', 'Mi cuenta | STL HUB');

export default function Page() {
	redirect('/account');
}
