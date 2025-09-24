"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import TerminalIcon from '@mui/icons-material/Terminal';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/*
  ConsoleBar: barra flotante tipo consola para el dashboard.
  - Colapsable
  - Muestra logs (simulados por ahora)
  - Auto-scroll, botón limpiar
  - Placeholder para futura conexión SSE/WebSocket
*/

const Root = styled('div')(({ theme }) => ({
  position: 'fixed',
  zIndex: 1300,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
}));

const ConsoleContainer = styled(Paper)(({ theme }) => ({
  margin: '0 auto',
  maxWidth: '1400px',
  borderTopLeftRadius: 8,
  borderTopRightRadius: 8,
  backgroundColor: theme.palette.mode === 'dark' ? '#111' : '#1e1e1e',
  color: '#ddd',
  boxShadow: '0 -2px 8px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}));

const Toolbar = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  gap: theme.spacing(1),
  background: 'linear-gradient(90deg,#333,#222)',
}));

const LogArea = styled('div')(({ theme }) => ({
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1.4,
  padding: theme.spacing(1),
  overflowY: 'auto',
  background: '#000',
  height: '100%'
}));

export default function ConsoleBar() {
  const [open, setOpen] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(320); // altura total cuando está abierto
  const toolbarRef = useRef(null);
  const [logHeight, setLogHeight] = useState(0);
  const [lines, setLines] = useState([]);
  const [live, setLive] = useState(true);
  const [levelsEnabled, setLevelsEnabled] = useState({ log: true, info: true, warn: true, error: true });
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(null); // {value,label}
  const logsRef = useRef(null);
  const simTimer = useRef(null);

  const toggle = () => setOpen(o => !o);

  // recalcular altura del panel de logs cuando se expande o cambia ventana
  useEffect(() => {
    if (!open) { setLogHeight(0); return; }
    const tb = toolbarRef.current;
    const tbH = tb ? tb.getBoundingClientRect().height : 40;
    setLogHeight(Math.max(0, expandedHeight - tbH));
  }, [open, expandedHeight]);
  useEffect(() => {
    const onResize = () => {
      if (!open) return;
      const tb = toolbarRef.current;
      const tbH = tb ? tb.getBoundingClientRect().height : 40;
      setLogHeight(Math.max(0, expandedHeight - tbH));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, expandedHeight]);

  const addLine = useCallback((text, extra={}) => {
    setLines(l => [...l.slice(-999), { id: Date.now() + Math.random(), text, ...extra }]);
  }, []);

  const clear = () => setLines([]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [lines]);

  // Conexión SSE
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
    const endpoint = base ? `${base}/api/logs/stream` : '/api/logs/stream';
    const evtSource = new EventSource(endpoint);
    evtSource.addEventListener('log', (ev) => {
      if (cancelled) return;
      try {
        const payload = JSON.parse(ev.data);
        if (!levelsEnabled[payload.level]) return;
        const ts = new Date(payload.timestamp).toLocaleTimeString();
        const msg = payload.messages.join(' ');
        addLine(`${ts} [${payload.level.toUpperCase()}] ${msg}`, { level: payload.level, ts: payload.timestamp });
      } catch (e) {
        addLine('Error parseando log SSE: ' + e.message, { level: 'error' });
      }
    });
    evtSource.onerror = () => { /* opcional: reconectar */ };
    return () => { cancelled = true; evtSource.close(); };
  }, [live, addLine, levelsEnabled]);

  // Simulación de logs (opcional para probar)
  const startSim = () => {
    if (simulating) return;
    setSimulating(true);
    setProgress({ value: 0, label: 'Simulando...' });
    let pct = 0;
    simTimer.current = setInterval(() => {
      pct += Math.random() * 15;
      if (pct >= 100) pct = 100;
      addLine(`[SIM] Progreso ${pct.toFixed(1)}%`);
      setProgress({ value: pct, label: `Progreso ${pct.toFixed(1)}%` });
      if (pct === 100) {
        addLine('[SIM] Tarea completada');
        clearInterval(simTimer.current);
        setTimeout(() => setSimulating(false), 1000);
      }
    }, 800);
  };

  const stopSim = () => {
    if (simTimer.current) clearInterval(simTimer.current);
    setSimulating(false);
    setProgress(null);
    addLine('[SIM] Simulación detenida');
  };

  useEffect(() => () => { if (simTimer.current) clearInterval(simTimer.current); }, []);

  return (
    <Root>
      <ConsoleContainer style={{ height: open ? expandedHeight : (toolbarRef.current?.getBoundingClientRect().height || 40) }}>
        <Toolbar ref={toolbarRef}>
          <TerminalIcon fontSize="small" />
          <Typography variant="caption" sx={{ flex: 1, userSelect: 'none' }}>
            Consola del Dashboard
          </Typography>
          {progress && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 160 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress variant="determinate" value={progress.value} sx={{ height: 6, borderRadius: 1 }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#ccc', minWidth: 70, textAlign: 'right' }}>{progress.label}</Typography>
            </Box>
          )}
          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: '#444' }} />
          {!simulating && <Tooltip title="Simular"><span><Button size="small" variant="outlined" color="inherit" onClick={startSim}>Sim</Button></span></Tooltip>}
          {simulating && <Tooltip title="Detener simulación"><span><Button size="small" variant="outlined" color="warning" onClick={stopSim}>Stop</Button></span></Tooltip>}
          <Tooltip title={live ? 'Pausar live' : 'Reanudar live'}>
            <span><Button size="small" variant="outlined" color={live ? 'success' : 'inherit'} onClick={() => setLive(v => !v)}>{live ? 'Live' : 'Off'}</Button></span>
          </Tooltip>
          <Tooltip title="Filtrar niveles">
            <IconButton size="small" color="inherit" onClick={() => {
              // ciclo rápido: all -> sólo warn+error -> sólo error -> all
              const allOn = Object.values(levelsEnabled).every(v => v);
              const onlySevere = levelsEnabled.warn && levelsEnabled.error && !levelsEnabled.log && !levelsEnabled.info;
              const onlyError = levelsEnabled.error && !levelsEnabled.warn && !levelsEnabled.log && !levelsEnabled.info;
              if (allOn) setLevelsEnabled({ log:false, info:false, warn:true, error:true });
              else if (onlySevere) setLevelsEnabled({ log:false, info:false, warn:false, error:true });
              else if (onlyError) setLevelsEnabled({ log:true, info:true, warn:true, error:true });
              else setLevelsEnabled({ log:true, info:true, warn:true, error:true });
            }}>
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Limpiar"><IconButton size="small" onClick={clear} color="inherit"><CloseIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title={open ? 'Colapsar' : 'Expandir'}>
            <IconButton size="small" onClick={toggle} color="inherit">
              {open ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
        {open && (
          <div style={{ height: logHeight, transition: 'height .2s', borderTop: '1px solid #222' }}>
            <LogArea ref={logsRef}>
              {lines.map(l => (
                <div key={l.id} style={{
                  color: l.level === 'error' ? '#ff6b6b' : l.level === 'warn' ? '#ffd166' : l.level === 'info' ? '#86c5ff' : '#eee'
                }}>
                  {l.text}
                </div>
              ))}
              {!lines.length && <div style={{ opacity: 0.5 }}>Sin output todavía...</div>}
            </LogArea>
          </div>
        )}
      </ConsoleContainer>
    </Root>
  );
}
