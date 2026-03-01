"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import TerminalIcon from '@mui/icons-material/Terminal';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import axiosInstance from '../../../services/AxiosInterceptor';
import useStore from '../../../store/useStore';

/*
  ConsoleBar: barra flotante tipo consola para el dashboard.
  - Colapsable
  - Muestra logs (simulados por ahora)
  - Auto-scroll, botón limpiar
  - Placeholder para futura conexión SSE/WebSocket
*/

const Root = styled('div')(({ theme }) => ({
  position: 'fixed',
  // Por encima de RightSidebar (9998) pero por debajo de overlays/modals (>=10000)
  zIndex: 9999,
  left: 0,
  right: 'var(--dash-right-offset, 0px)',
  bottom: 0,
  pointerEvents: 'none',
  // Alinear con el layout del dashboard (evita quedar debajo del sidenav en desktop)
  paddingLeft: 16,
  paddingRight: 16,
  boxSizing: 'border-box',
  [theme.breakpoints.up('lg')]: {
    left: 240,
  },
}));

const ConsoleContainer = styled(Paper)(({ theme }) => ({
  width: '100%',
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
  const [restartLoading, setRestartLoading] = useState(false);
  const [levelsEnabled, setLevelsEnabled] = useState({ log: true, info: true, warn: true, error: true });
  const logsRef = useRef(null);
  const roleId = useStore((s) => s.roleId);

  const scrollLogsToBottom = useCallback(() => {
    const el = logsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

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

  const requestRestart = useCallback(async () => {
    if (restartLoading) return;
    const ok = window.confirm('¿Reiniciar el backend ahora? Esto cortará conexiones activas por unos segundos.');
    if (!ok) return;

    setRestartLoading(true);
    addLine('Solicitando reinicio del backend...', { level: 'warn' });
    try {
      const res = await axiosInstance.post('/admin/ops/restart', { confirm: true });
      addLine(res?.data?.message || 'Reinicio solicitado. Esperando reconexión...', { level: 'info' });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Error solicitando reinicio';
      addLine(`Restart error: ${msg}`, { level: 'error' });
    } finally {
      setRestartLoading(false);
    }
  }, [restartLoading, addLine]);

  const clear = () => setLines([]);

  useEffect(() => {
    scrollLogsToBottom();
  }, [lines, scrollLogsToBottom]);

  // Al abrir/expandir: forzar scroll al final aunque no entren logs nuevos.
  useEffect(() => {
    if (!open) return;
    // Esperar a que el DOM pinte y el contenedor tenga altura.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        scrollLogsToBottom();
      });
      // backup extra por si MUI/transitions retrasan layout
      const t = window.setTimeout(() => scrollLogsToBottom(), 50);
      return () => {
        cancelAnimationFrame(raf2);
        window.clearTimeout(t);
      };
    });
    return () => cancelAnimationFrame(raf1);
  }, [open, logHeight, scrollLogsToBottom]);

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

  return (
    <Root>
      <ConsoleContainer style={{ height: open ? expandedHeight : (toolbarRef.current?.getBoundingClientRect().height || 40) }}>
        <Toolbar ref={toolbarRef}>
          <TerminalIcon fontSize="small" />
          <Typography variant="caption" sx={{ flex: 1, userSelect: 'none' }}>
            Consola del Dashboard
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: '#444' }} />
          <Tooltip title={live ? 'Pausar live' : 'Reanudar live'}>
            <IconButton size="small" color="inherit" onClick={() => setLive(v => !v)}>
              {live ? <PauseCircleOutlineIcon fontSize="small" /> : <PlayCircleOutlineIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {Number(roleId) === 2 && (
            <Tooltip title="Reiniciar backend (PM2)">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<RestartAltIcon fontSize="small" />}
                  disabled={restartLoading}
                  onClick={requestRestart}
                >
                  {restartLoading ? 'Restarting' : 'Restart'}
                </Button>
              </span>
            </Tooltip>
          )}
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
