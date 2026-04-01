import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  LinearProgress,
  Box,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import HttpService from '@/services/HttpService';
import { errorAlert, timerAlert } from '@/helpers/alerts';

const http = new HttpService();
const API_BASE = '/accounts';

export default function BulkAddAccountsModal({ open, onClose, onComplete }) {
  const [showPassword, setShowPassword] = useState(false);
  const [textData, setTextData] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConf, setPasswordConf] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  const [logs, setLogs] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  
  const handleClose = () => {
    if (isProcessing) return; // Bloquear cierre si está trabajando
    onClose();
  };

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const processBulk = async () => {
    if (!password || password !== passwordConf) {
      errorAlert('Error', 'Las contraseñas no coinciden o están vacías.');
      return;
    }
    
    // Parseo: ignorar líneas vacías
    const lines = textData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      errorAlert('Error', 'No hay datos para procesar.');
      return;
    }

    const items = [];
    // Formato esperado: main_email  backup_email  backup_alias
    for (const [idx, line] of lines.entries()) {
      const parts = line.split(/[\t\s]+/);
      if (parts.length < 3) {
        errorAlert('Error de Formato', `La línea ${idx + 1} no tiene 3 columnas claras.\nContenido: "${line}"`);
        return;
      }
      const [mainEmail, backupEmail, backupAlias] = parts;
      const mainAlias = mainEmail.split('@')[0];
      
      items.push({
        lineNum: idx + 1,
        mainEmail,
        backupEmail,
        backupAlias,
        mainAlias
      });
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setErrorCount(0);
    let errs = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pct = Math.round((i / items.length) * 100);
      setProgress(pct);
      setProgressText(`Procesando Par ${i+1}/${items.length}: ${item.mainAlias}`);
      
      try {
        // ------------------ 1. CREAR MAIN ------------------
        addLog(`[${i+1}] Creando Main: ${item.mainAlias}...`);
        const mainRes = await http.postData(`${API_BASE}`, {
          alias: item.mainAlias,
          email: item.mainEmail,
          baseFolder: '/STLHUB',
          type: 'main',
          credentials: { type: 'login', username: item.mainEmail, password }
        });
        const mainId = mainRes.data?.id;
        if (!mainId) throw new Error('No devolvió ID al crear la cuenta Main');
        
        // ------------------ 2. TEST MAIN ------------------
        addLog(`[${i+1}] Validando Main (Test/Proxy): ${item.mainAlias}...`);
        // Test usa proxy rotation internamente en el mega-get/proxy wrapper si está configurado
        await http.postData(`${API_BASE}/${mainId}/test`, { force: true, source: 'bulk-insert' });
        
        // ------------------ 3. CREAR BACKUP ------------------
        addLog(`[${i+1}] Creando Backup: ${item.backupAlias}...`);
        const bkRes = await http.postData(`${API_BASE}`, {
          alias: item.backupAlias,
          email: item.backupEmail,
          baseFolder: '/STLHUB',
          type: 'backup',
          credentials: { type: 'login', username: item.backupEmail, password }
        });
        const backupId = bkRes.data?.id;
        if (!backupId) throw new Error('No devolvió ID al crear la cuenta Backup');

        // ------------------ 4. TEST BACKUP ------------------
        addLog(`[${i+1}] Validando Backup (Test/Proxy): ${item.backupAlias}...`);
        await http.postData(`${API_BASE}/${backupId}/test`, { force: true, source: 'bulk-insert' });

        // ------------------ 5. ENLAZAR BACKUP -> MAIN ------------------
        addLog(`[${i+1}] Enlazando ${item.backupAlias} -> ${item.mainAlias}...`);
        await http.postData(`${API_BASE}/${mainId}/backups`, { backupAccountId: Number(backupId) });
        
        addLog(`[${i+1}] ¡Par Completado con Éxito!`, 'success');

      } catch (err) {
        errs++;
        setErrorCount(errs);
        const errMsg = err?.response?.data?.message || err.message || 'Error desconocido';
        addLog(`[${i+1}] ERROR en ${item.mainAlias}: ${errMsg}`, 'error');
        // El bucle continuará con el siguiente "Par" para no bloquear la operación masiva
      }
    }

    setProgress(100);
    setProgressText(`Terminado. ${items.length} procesados con ${errs} errores.`);
    setIsProcessing(false);
    
    if (onComplete) {
      onComplete(); // para que la pestaña principal recargue las cuentas
    }
    if (errs === 0) {
      timerAlert('Éxito masivo', 'Todas las cuentas se subieron sin problemas', 2000);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Añadir Múltiples Cuentas (Masa)</DialogTitle>
      <DialogContent dividers>
        {!isProcessing && progress === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Pega las credenciales separadas por <strong>tabulaciones</strong> o espacios. Formato estricto por renglón:<br/>
            <code>main_email &nbsp;&nbsp;&nbsp;&nbsp; backup_email &nbsp;&nbsp;&nbsp;&nbsp; backup_alias</code>
          </Alert>
        )}
        
        <Box sx={{ display: isProcessing || progress > 0 ? 'none' : 'block' }}>
          <TextField
             fullWidth
             multiline
             rows={8}
             label="Pega aquí el texto masivo"
             variant="outlined"
             value={textData}
             onChange={e => setTextData(e.target.value)}
             sx={{ mb: 3 }}
             placeholder="westeroswow+195@gmail.com    westeroswow+195backupa@gmail.com    westeroswow+195_A&#10;westeroswow+196@gmail.com    westeroswow+196backupa@gmail.com    westeroswow+196_A"
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Contraseña Maestra Compartida"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Confirmar Contraseña"
              value={passwordConf}
              onChange={(e) => setPasswordConf(e.target.value)}
            />
          </Stack>
        </Box>

        {(isProcessing || progress > 0) && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{progressText}</Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 1 }} />
            
            <Box className="glass" sx={{ mt: 2, height: 260, overflowY: 'auto', p: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
              {logs.map((L, i) => (
                <Typography 
                  key={i} 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    color: L.type === 'error' ? '#ef4444' : (L.type === 'success' ? '#10b981' : '#cbd5e1') 
                  }}
                >
                  [{L.time}] {L.msg}
                </Typography>
              ))}
            </Box>
            {errorCount > 0 && (
               <Alert severity="warning" sx={{ mt: 2 }}>Saltando errores: Hubo fallos en {errorCount} cuentas. Revisa los logs rojo.</Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isProcessing} color="inherit">
          {progress === 100 ? 'Cerrar' : 'Cancelar'}
        </Button>
        <Button 
           onClick={processBulk} 
           variant="contained" 
           color="primary" 
           disabled={isProcessing || textData.trim() === '' || progress === 100}
        >
          {isProcessing ? 'Procesando...' : 'Iniciar Procesamiento Masivo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
