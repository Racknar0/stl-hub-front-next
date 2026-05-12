import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, IconButton, CircularProgress, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HttpService from '@/services/HttpService';

const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
const imgUrl = (rel) => {
    if (!rel) return '';
    const s = String(rel).trim();
    if (/^https?:\/\//i.test(s)) return s;
    return `${UPLOAD_BASE}/${s.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

export default function UserDetailModal({ open, onClose, userId }) {
    const [detailUser, setDetailUser] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const http = new HttpService();

    useEffect(() => {
        if (open && userId) {
            let mounted = true;
            const fetchUser = async () => {
                setDetailLoading(true);
                setDetailUser(null);
                try {
                    const res = await http.getData(`/users/${userId}`);
                    if (mounted) setDetailUser(res.data);
                } catch (e) {
                    console.error('Error loading user detail', e);
                } finally {
                    if (mounted) setDetailLoading(false);
                }
            };
            fetchUser();
            return () => { mounted = false; };
        }
    }, [open, userId]);

    const du = detailUser;
    const sub = du?.subscription;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    backgroundColor: '#0f1225',
                    color: '#e2e8f0',
                    border: '1px solid rgba(167,139,250,0.2)',
                    borderRadius: 3,
                    maxHeight: '85vh',
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1 }}>
                <span style={{ fontWeight: 700 }}>👤 Detalle de usuario</span>
                <IconButton onClick={onClose} size="small" sx={{ color: '#94a3b8' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 2 }}>
                {detailLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} sx={{ color: '#a78bfa' }} />
                    </Box>
                ) : du ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* User info */}
                        <Box>
                            <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>Datos del usuario</Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '.88rem' }}>
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
                                <span><strong>Idioma:</strong> {du.language || 'es'}</span>
                                <span><strong>Rol:</strong> {du.roleId === 2 ? 'Admin' : 'Usuario'}</span>
                            </Box>
                        </Box>

                        {/* Subscription */}
                        <Box>
                            <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>💳 Suscripción</Box>
                            {sub ? (
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '.88rem' }}>
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
                            <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>📊 Actividad</Box>
                            <Box sx={{ fontSize: '.88rem' }}>
                                <strong>Total descargas:</strong> {du.stats?.totalDownloads ?? 0}
                            </Box>
                            {du.stats?.topCategories?.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {du.stats.topCategories.map((c) => (
                                        <Chip key={c.id} label={`${c.name} (${c.count})`} size="small" sx={{
                                            backgroundColor: 'rgba(167,139,250,0.15)', color: '#c4b5fd', fontSize: '.72rem', height: 22,
                                        }} />
                                    ))}
                                </Box>
                            )}
                        </Box>

                        {/* Downloads */}
                        <Box>
                            <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>📥 Historial de descargas</Box>
                            {du.downloads?.length > 0 ? (
                                <Box sx={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {du.downloads.map((d, i) => (
                                        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            {d.image ? (
                                                <img src={imgUrl(d.image)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                                            ) : (
                                                <Box sx={{ width: 36, height: 36, borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                                            )}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ fontSize: '.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</Box>
                                                <Box sx={{ fontSize: '.72rem', color: '#64748b' }}>{new Date(d.downloadedAt).toLocaleString()}</Box>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ color: '#64748b', fontSize: '.88rem' }}>Sin descargas</Box>
                            )}
                        </Box>

                        {/* Attribution */}
                        {(du.utmSource || du.utmCampaign || du.utmLandingUrl) && (
                            <Box>
                                <Box sx={{ fontSize: '.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>🔗 Atribución</Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '.82rem' }}>
                                    {du.utmSource && <span><strong>Source:</strong> {du.utmSource}</span>}
                                    {du.utmMedium && <span><strong>Medium:</strong> {du.utmMedium}</span>}
                                    {du.utmCampaign && <span><strong>Campaign:</strong> {du.utmCampaign}</span>}
                                    {du.utmContent && <span><strong>Content:</strong> {du.utmContent}</span>}
                                </Box>
                                {du.utmLandingUrl && (
                                    <Box sx={{ fontSize: '.78rem', color: '#64748b', mt: 0.5, wordBreak: 'break-all' }}>
                                        <strong>Landing:</strong> {du.utmLandingUrl}
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
