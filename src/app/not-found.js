import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem',
      color: '#fff',
      background: '#070b15'
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1rem', color: '#00e7ff' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Página o modelo no encontrado</h2>
      <p style={{ color: '#94a3b8', maxWidth: '500px', marginBottom: '2rem' }}>
        El archivo o modelo 3D que buscas no existe o ha sido movido.
      </p>
      <Link href="/" style={{
        padding: '0.75rem 1.5rem',
        borderRadius: '0.5rem',
        background: '#00e7ff',
        color: '#070b15',
        fontWeight: 600,
        textDecoration: 'none'
      }}>
        Volver al inicio
      </Link>
    </div>
  );
}
