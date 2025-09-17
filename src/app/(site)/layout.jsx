import React from 'react';
import Layout from '../../components/layout/Layout/Layout';

export default function SiteLayout({ children }) {
  return (
    <Layout>
      {children}
    </Layout>
  );
}
