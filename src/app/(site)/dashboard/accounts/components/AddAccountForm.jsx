import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  TextField,
  Stack,
  Button as MUIButton,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function AddAccountForm({ form, setForm, onSubmit, disabled, onBulkOpen }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Card sx={{ mb: 1.5, bgcolor: '#101b2a', border: '1px solid rgba(148,163,184,.23)', borderRadius: 2, boxShadow: 'none' }}>
      <CardHeader title="Nueva cuenta MEGA" titleTypographyProps={{ fontSize: 15, fontWeight: 600 }} sx={{ pb: 0 }} />
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <TextField label="Alias" size="small" fullWidth value={form.alias} onChange={(e)=>setForm(f=>({...f, alias:e.target.value}))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <TextField type="email" label="Correo" size="small" fullWidth value={form.email} onChange={(e)=>setForm(f=>({...f, email:e.target.value}))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <TextField label="Carpeta base" size="small" fullWidth value={form.baseFolder} onChange={(e)=>setForm(f=>({...f, baseFolder:e.target.value}))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <TextField select label="Tipo" size="small" fullWidth SelectProps={{ native:true }} value={form.type} onChange={(e)=>setForm(f=>({...f, type:e.target.value}))} >
              <option value="main">main</option>
              <option value="backup">backup</option>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <TextField label="Usuario (MEGA email)" size="small" fullWidth value={form.username} onChange={(e)=>setForm(f=>({...f, username:e.target.value}))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <TextField
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              size="small" fullWidth
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={12}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <MUIButton variant="outlined" onClick={onBulkOpen} disabled={disabled} sx={{ color: '#7dd3fc', borderColor: 'rgba(56,189,248,.4)', textTransform: 'none' }}>+ Añadir Múltiples Cuentas</MUIButton>
              <MUIButton variant="outlined" onClick={onSubmit} disabled={disabled}>Crear</MUIButton>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
