import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "../styles/bundle.scss";

export const metadata = {
  title: "STL HUB",
  description: "Explora modelos 3D, props y cosplay listos para imprimir.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Poppins:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
