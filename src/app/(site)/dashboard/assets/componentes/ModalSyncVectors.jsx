import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Paper,
    CircularProgress
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HttpService from '@/services/HttpService';

export default function ModalSyncVectors({ open, onClose }) {
    const [status, setStatus] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(true);
    const [limit, setLimit] = useState(10);
    const [logs, setLogs] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const logsEndRef = useRef(null);
    const http = new HttpService();

    useEffect(() => {
        if (open) {
            fetchStatus();
            setLogs([]);
            setLimit(30);
            setSyncing(false);
        }
    }, [open]);

    useEffect(() => {
        // Auto scroll to bottom of logs
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const fetchStatus = async () => {
        setLoadingInfo(true);
        try {
            const res = await http.getData('/ai/sync-status');
            setStatus(res.data);
        } catch (error) {
            console.error('Error fetching vector status:', error);
            setStatus(null);
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleSync = () => {
        const configuredBaseUrl =
            process.env.NEXT_PUBLIC_API_BASE_URL ||
            process.env.NEXT_PUBLIC_API_BASE ||
            process.env.NEXT_PUBLIC_BASE_URL_API ||
            '';

        setSyncing(true);
        setLogs(prev => [...prev, '[INFO] Iniciando conexión SSE con el servidor...']);

        // Llamada con Server-Sent Events nativo
        const apiUrl = (configuredBaseUrl || 'http://localhost:3001')
            .replace(/\/api\/?$/, '')
            .replace(/\/$/, '');
        const url = `${apiUrl}/api/ai/sync-missing`;
        const safeLimit = Math.min(1000, Math.max(1, Math.floor(Number(limit) || 10)));
        if (!configuredBaseUrl) {
            setLogs(prev => [...prev, '[WARN] NEXT_PUBLIC_API_BASE_URL no definida. Usando fallback: http://localhost:3001']);
        }
        
        try {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ limit: safeLimit })
            }).then(async response => {
                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");

                let done = false;
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) {
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n').filter(l => l.trim() !== '');
                        
                        lines.forEach(line => {
                            if (line.startsWith('data:')) {
                                try {
                                    const parsed = JSON.parse(line.replace('data:', ''));
                                    if (parsed.message) {
                                        setLogs(prev => [...prev, parsed.message]);
                                    }
                                    if (parsed.done) {
                                        setSyncing(false);
                                        fetchStatus();
                                    }
                                } catch(e) {
                                    setLogs(prev => [...prev, `⚠️ Evento SSE no parseable: ${line}`]);
                                }
                            }
                        });
                    }
                }
                setSyncing(false);
                fetchStatus();
            }).catch(e => {
                setLogs(prev => [...prev, `❌ Error de red SSE: ${e?.message}`]);
                setSyncing(false);
            });
        } catch(e) {
            setLogs(prev => [...prev, `❌ Error iniciando SSE: ${e?.message}`]);
            setSyncing(false);
        }
    };

    return (
        <Dialog open={open} onClose={!syncing ? onClose : null} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="secondary" /> Sincronizar Vectores Faltantes (IA)
            </DialogTitle>
            <DialogContent dividers>
                {loadingInfo ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box mb={3}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Los assets existentes deben tener una representación vectorial en Qdrant para aparecer en la Búsqueda Mágica.
                        </Typography>

                        <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 2, bgcolor: 'background.default' }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="subtitle2">Assets Activos en SQL (Total):</Typography>
                                <Typography variant="subtitle2">{status?.dbCount || 0}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="subtitle2">Vectores en Qdrant:</Typography>
                                <Typography variant="subtitle2" color="primary.main">{status?.qdrantCount || 0}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="subtitle2" color="error.main">Faltantes Estimados:</Typography>
                                <Typography variant="subtitle2" color="error.main" fontWeight="bold">
                                    {status?.estimatedMissing || 0}
                                </Typography>
                            </Box>
                        </Paper>

                        <Box display="flex" alignItems="center" gap={2}>
                            <TextField
                                label="Cantidad a generar (esta corrida)"
                                type="number"
                                size="small"
                                disabled={syncing}
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                inputProps={{ min: 1, step: 1 }}
                                sx={{ width: 150 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Si faltan 10 y pones 5, se generan 5 en esta corrida.
                            </Typography>
                        </Box>
                    </Box>
                )}

                {logs.length > 0 && (
                    <Paper 
                        variant="outlined" 
                        sx={{ 
                            p: 2, 
                            maxHeight: 250, 
                            overflow: 'auto', 
                            bgcolor: '#1e1e1e', 
                            color: '#00ff00', 
                            fontFamily: 'monospace',
                            fontSize: '0.85rem'
                        }}
                    >
                        {logs.map((log, idx) => (
                            <Box key={idx} sx={{ mb: 0.5 }}>{log}</Box>
                        ))}
                        <div ref={logsEndRef} />
                    </Paper>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={syncing}>Cerrar</Button>
                <Button 
                    variant="contained" 
                    color="secondary" 
                    onClick={handleSync} 
                    disabled={syncing || loadingInfo || !status?.estimatedMissing}
                    startIcon={syncing && <CircularProgress size={16} color="inherit" />}
                >
                    {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
