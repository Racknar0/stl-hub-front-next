import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, IconButton, CircularProgress, Chip, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HttpService from '@/services/HttpService';
import PersonOutline from '@mui/icons-material/PersonOutline';
import OpenInNew from '@mui/icons-material/OpenInNew';
import UserLocation from '@/components/dashboard/UserLocation';

const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
const imgUrl = (rel) => {
    if (!rel) return '';
    const s = String(rel).trim();
    if (/^https?:\/\//i.test(s)) return s;
    return `${UPLOAD_BASE}/${s.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

const DL_PAGE_SIZE = 20;

export default function UserDetailModal({ open, onClose, userId }) {
    const [detailUser, setDetailUser] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [dlPage, setDlPage] = useState(1);
    const http = useMemo(() => new HttpService(), []);
    const requestRef = useRef(0);

    const fetchUser = useCallback(async (page = 1) => {
        if (!userId) return;
        const requestId = ++requestRef.current;
        setDetailLoading(true);
        try {
            const res = await http.getData(`/users/${userId}?dlPage=${page}&dlPageSize=${DL_PAGE_SIZE}`);
            if (requestId === requestRef.current) setDetailUser(res.data);
        } catch (e) {
            console.error('Error loading user detail', e);
        } finally {
            if (requestId === requestRef.current) setDetailLoading(false);
        }
    }, [userId, http]);

    useEffect(() => {
        if (open && userId) {
            setDetailUser(null);
            setDlPage(1);
            fetchUser(1);
        }
        if (!open) {
            requestRef.current++;
            setDetailUser(null);
        }
    }, [open, userId, fetchUser]);

    const handleDlPageChange = (newPage) => {
        setDlPage(newPage);
        fetchUser(newPage);
    };

    const du = detailUser;
    const sub = du?.subscription;
    const dlTotal = du?.dlTotal ?? du?.stats?.totalDownloads ?? 0;
    const dlTotalPages = Math.max(1, Math.ceil(dlTotal / DL_PAGE_SIZE));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    backgroundColor: '#101b2a',
                    color: '#e2e8f0',
                    border: '1px solid rgba(148,163,184,0.23)',
                    borderRadius: 3,
                    maxHeight: '85vh',
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1 }}>
                <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', fontSize: 15, fontWeight: 600 }}><PersonOutline sx={{ fontSize: 20, color: '#7dd3fc' }} />Detalle de usuario <Box component="span" sx={{ color: '#7b91aa', fontSize: 12 }}>#{userId}</Box></Box>
                <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 2 }}>
                {detailLoading && !du ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#7dd3fc' }} />
                    </Box>
                ) : du ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 1, pb: 1.5, borderBottom: '1px solid rgba(148,163,184,.15)' }}>
                            {[
                                ['Descargas', Number(dlTotal).toLocaleString('es-CO')],
                                ['Antigüedad', du.createdAt && !Number.isNaN(Date.parse(du.createdAt)) ? `${Math.max(0, Math.floor((Date.now() - Date.parse(du.createdAt)) / 86400000))} días` : 'Sin dato'],
                                ['Suscripción', sub ? `${sub.daysRemaining} días` : 'Sin plan activo'],
                            ].map(([label, value]) => <Box key={label}><Box sx={{ color: '#7b91aa', fontSize: 10 }}>{label}</Box><Box sx={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, mt: .3 }}>{value}</Box></Box>)}
                        </Box>
                        {/* User info */}
                        <Box>
                            <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Datos del usuario</Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, fontSize: '.88rem' }}>
                                <span><strong>Email:</strong> {du.email}</span>
                                <span>
                                    <strong>Activo:</strong>{' '}
                                    <Chip label={du.isActive ? '✓ Activo' : '✗ Inactivo'} size="small" sx={{
                                        backgroundColor: du.isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                        color: du.isActive ? '#22c55e' : '#ef4444',
                                        fontWeight: 700, fontSize: '.7rem', height: 22,
                                    }} />
                                </span>
                                <span><strong>Registro:</strong> {new Date(du.createdAt).toLocaleDateString()}</span>
                                <span><strong>Último login:</strong> {du.lastLogin ? new Date(du.lastLogin).toLocaleString() : '—'}</span>
                                <span><strong>Idioma:</strong> {du.language || 'Sin dato'}</span>
                                <span><strong>Actualizado:</strong> {du.updatedAt ? new Date(du.updatedAt).toLocaleString('es-CO') : 'Sin dato'}</span>
                                <span><strong>Rol:</strong> {du.roleId === 2 ? 'Admin' : 'Usuario'}</span>
                            </Box>
                        </Box>

                        <Box>
                            <Box sx={{ fontSize: 11, color: '#94a3b8', mb: 1 }}>País e IP</Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                                <Box><Box sx={{ fontSize: 10, color: '#7b91aa', mb: .5 }}>Registro</Box><UserLocation ip={du.registerIp} country={du.registerCountry} /></Box>
                                <Box><Box sx={{ fontSize: 10, color: '#7b91aa', mb: .5 }}>Último login</Box><UserLocation ip={du.lastLoginIp} country={du.lastLoginCountry} /></Box>
                            </Box>
                        </Box>
                        {/* Subscription */}
                        <Box>
                            <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Suscripción</Box>
                            {sub ? (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, fontSize: '.88rem' }}>
                                    <span><strong>Estado:</strong> {sub.status}</span>
                                    <span><strong>Días restantes:</strong> {sub.daysRemaining}</span>
                                    <span><strong>Inicio:</strong> {new Date(sub.startedAt).toLocaleDateString()}</span>
                                    <span><strong>Expira:</strong> {new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                                </Box>
                            ) : (
                                <Box sx={{ color: '#64748b', fontSize: '.88rem' }}>Sin suscripción activa</Box>
                            )}
                        </Box>

                        {/* Stats */}
                        <Box>
                            <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Actividad</Box>
                            <Box sx={{ fontSize: '.88rem' }}>
                                <strong>Total descargas:</strong> {dlTotal}
                            </Box>
                            {du.stats?.topCategories?.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {du.stats.topCategories.map((c) => (
                                        <Chip key={c.id} label={c.name} title="Categoría presente en esta página del historial" size="small" sx={{
                                            backgroundColor: 'rgba(56,189,248,0.08)', color: '#7dd3fc', fontSize: '.72rem', height: 22,
                                        }} />
                                    ))}
                                </Box>
                            )}
                        </Box>

                        {/* Downloads */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Historial de descargas</Box>
                                {dlTotal > DL_PAGE_SIZE && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <IconButton
                                            size="small"
                                            disabled={dlPage <= 1 || detailLoading}
                                            onClick={() => handleDlPageChange(dlPage - 1)}
                                            sx={{ color: '#7dd3fc', p: 0.3, '&.Mui-disabled': { color: '#334155' } }}
                                        >
                                            <ChevronLeftIcon fontSize="small" />
                                        </IconButton>
                                        <Box sx={{ fontSize: '.72rem', color: '#94a3b8', minWidth: 50, textAlign: 'center' }}>
                                            {dlPage} / {dlTotalPages}
                                        </Box>
                                        <IconButton
                                            size="small"
                                            disabled={dlPage >= dlTotalPages || detailLoading}
                                            onClick={() => handleDlPageChange(dlPage + 1)}
                                            sx={{ color: '#7dd3fc', p: 0.3, '&.Mui-disabled': { color: '#334155' } }}
                                        >
                                            <ChevronRightIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                )}
                            </Box>
                            {detailLoading && du ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={20} sx={{ color: '#7dd3fc' }} />
                                </Box>
                            ) : du.downloads?.length > 0 ? (
                                <Box sx={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {du.downloads.map((d, i) => {
                                        const href = d.slug ? `/asset/${encodeURIComponent(d.slug)}` : undefined;
                                        return <Box key={`${d.assetId}-${i}`} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: .7, borderBottom: '1px solid rgba(148,163,184,.12)' }}>
                                            <Box component={href ? 'a' : 'span'} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-label={href ? `Abrir ficha de ${d.title}` : undefined} sx={{ display: 'block', flexShrink: 0 }}>
                                                {d.image ? <img src={imgUrl(d.image)} alt="" width="36" height="36" style={{ objectFit: 'cover', borderRadius: 4 }} /> : <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'rgba(148,163,184,.07)' }} />}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box component={href ? 'a' : 'span'} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} sx={{ display: 'block', fontSize: 12, color: '#cbd5e1', fontWeight: 500, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { color: '#7dd3fc' } }}>{d.title}</Box>
                                                <Box sx={{ fontSize: 10, color: '#7b91aa', mt: .3 }}>{new Date(d.downloadedAt).toLocaleString('es-CO')}</Box>
                                            </Box>
                                            <Tooltip title={href ? 'Abrir ficha pública' : 'Ficha no disponible'}><span><IconButton component={href ? 'a' : 'button'} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} disabled={!href} size="small" aria-label="Abrir ficha pública"><OpenInNew sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
                                        </Box>;
                                    })}
                                </Box>
                            ) : (
                                <Box sx={{ color: '#64748b', fontSize: '.88rem' }}>Sin descargas</Box>
                            )}
                        </Box>

                        {/* Attribution */}
                        {(du.utmSource || du.utmMedium || du.utmCampaign || du.utmContent || du.utmTerm || du.utmLandingUrl || du.utmReferrer) && (
                            <Box>
                                <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Origen del registro</Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, fontSize: '.82rem' }}>
                                    {du.utmSource && <span><strong>Fuente:</strong> {du.utmSource}</span>}
                                    {du.utmMedium && <span><strong>Medio:</strong> {du.utmMedium}</span>}
                                    {du.utmCampaign && <span><strong>Campaña:</strong> {du.utmCampaign}</span>}
                                    {du.utmContent && <span><strong>Contenido:</strong> {du.utmContent}</span>}
                                    {du.utmTerm && <span><strong>Término:</strong> {du.utmTerm}</span>}
                                </Box>
                                {du.utmReferrer && <Box sx={{ fontSize: 11, color: '#94a3b8', mt: .5, overflowWrap: 'anywhere' }}><strong>Procedencia:</strong> {du.utmReferrer}</Box>}
                                {du.utmLandingUrl && (
                                    <Box sx={{ fontSize: '.78rem', color: '#64748b', mt: 0.5, wordBreak: 'break-all' }}>
                                        <strong>Página de llegada:</strong> {du.utmLandingUrl}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>No se encontró el usuario</Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
