import React from 'react';
import { Card, CardHeader, CardContent, LinearProgress, Typography } from '@mui/material';

export default function StorageSummaryCard({ totalStorage }) {
  if (!totalStorage || totalStorage.okCount <= 0) return null;
  return (
    <Card className="glass" sx={{ mb: 2 }}>
      <CardHeader title="Almacenamiento total (MAIN OK)" subheader={totalStorage.okCount === 1 ? '1 cuenta' : `${totalStorage.okCount} cuentas`} />
      <CardContent>
        <LinearProgress variant="determinate" value={totalStorage.pct} sx={{ height: 14, borderRadius: 2, mb:1 }} />
        <Typography variant="body2">
          {Math.round(totalStorage.used).toLocaleString()} MB / {Math.round(totalStorage.total).toLocaleString()} MB
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {(totalStorage.used / 1024).toFixed(2)} GB / {(totalStorage.total / 1024).toFixed(2)} GB
        </Typography>
      </CardContent>
    </Card>
  );
}
