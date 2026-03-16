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

export default function AddAccountForm({ form, setForm, onSubmit, disabled }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Card className="glass" sx={{ mb: 2 }}>
      <CardHeader title="Añadir cuenta MEGA" />
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <TextField label="Alias" fullWidth value={form.alias} onChange={(e)=>setForm(f=>({...f, alias:e.target.value}))} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField type="email" label="Correo" fullWidth value={form.email} onChange={(e)=>setForm(f=>({...f, email:e.target.value}))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Carpeta base" fullWidth value={form.baseFolder} onChange={(e)=>setForm(f=>({...f, baseFolder:e.target.value}))} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select label="Tipo" fullWidth SelectProps={{ native:true }} value={form.type} onChange={(e)=>setForm(f=>({...f, type:e.target.value}))} >
              <option value="main">main</option>
              <option value="backup">backup</option>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="Usuario (MEGA email)" fullWidth value={form.username} onChange={(e)=>setForm(f=>({...f, username:e.target.value}))} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              fullWidth
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
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <MUIButton variant="outlined" onClick={onSubmit} disabled={disabled}>Crear</MUIButton>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
