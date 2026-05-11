'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import HttpService from '../../../../services/HttpService';
import {
    successAlert,
    errorAlert,
    confirmAlert,
    fireAlert,
} from '../../../../helpers/alerts';
import {
    MaterialReactTable,
    useMaterialReactTable,
} from 'material-react-table';
import {
    Box,
    IconButton,
    Tooltip,
    TextField,
    Button as MUIButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
const imgUrl = (rel) => {
    if (!rel) return '';
    const s = String(rel).trim();
    if (/^https?:\/\//i.test(s)) return s;
    return `${UPLOAD_BASE}/${s.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

export default function UsersPage() {
    const http = new HttpService();

    const [data, setData] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [q, setQ] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form create
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', daysToAdd: 90 });

    // User detail modal
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailUser, setDetailUser] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const generateStrongPassword = (length = 12) => {
        const lowers = 'abcdefghijklmnopqrstuvwxyz';
        const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nums = '0123456789';
        const syms = '!@#$%^&*()-_=+[]{};:,.<>?';
        const all = lowers + uppers + nums + syms;
        const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];
        let pwd = [pick(lowers), pick(uppers), pick(nums), pick(syms)];
        for (let i = pwd.length; i < length; i++) pwd.push(pick(all));
        for (let i = pwd.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
        }
        return pwd.join('');
    };

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const page = Number(pagination.pageIndex) ?? 0;
            const size = Number(pagination.pageSize) || 50;
            const res = await http.getData(
                `/users?page=${page + 1}&pageSize=${size}&q=${encodeURIComponent(searchTerm)}`
            );
            const payload = res.data;
            setData(
                (payload.data || []).map((u) => {
                    const sub = u.subscriptions?.[0];
                    const now = new Date();
                    const end = sub ? new Date(sub.currentPeriodEnd) : null;
                    const daysRemaining = end
                        ? Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
                        : null;
                    return {
                        ...u,
                        subEnds: end ? end.toLocaleDateString() : '—',
                        subDaysLeft: daysRemaining,
                    };
                })
            );
            setRowCount(payload.total || 0);
            setError(null);
        } catch (err) {
            setError('No se pudieron cargar los usuarios');
        } finally {
            setLoading(false);
        }
    }, [pagination, searchTerm]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const onDelete = async (row) => {
        const u = row.original;
        const ok = await confirmAlert(
            'Eliminar usuario',
            `¿Deseas eliminar ${u.email}?`,
            'Eliminar',
            'Cancelar',
            'warning'
        );
        if (!ok) return;
        try {
            await http.deleteData('/users', u.id);
            await successAlert('Usuario eliminado', 'El usuario se eliminó correctamente');
            fetchUsers();
        } catch (e) {
            await errorAlert('Error', e?.response?.data?.message || 'No se pudo eliminar el usuario');
        }
    };

    const onUpdate = async (row) => {
        const u = row.original;
        const result = await fireAlert({
            title: 'Extender suscripción',
            text: `Ingresa los días a agregar para ${u.email}`,
            input: 'number',
            inputAttributes: { min: 1, max: 3650, step: 1 },
            inputValue: 30,
            showCancelButton: true,
            confirmButtonText: 'Extender',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            zIndex: 2000,
            inputValidator: (value) => {
                const n = Number(value);
                if (!Number.isFinite(n) || n <= 0) return 'Ingresa un número válido (> 0)';
                if (n > 3650) return 'Máximo permitido: 3650 días';
                return undefined;
            },
        });
        if (!result.isConfirmed) return;
        const daysToAdd = Number(result.value);
        try {
            await http.postData(`/users/${u.id}/subscription/extend`, { daysToAdd });
            await successAlert('Suscripción actualizada', 'Se extendió la suscripción correctamente');
            fetchUsers();
        } catch (e) {
            await errorAlert('Error', e?.response?.data?.message || 'No se pudo actualizar la suscripción');
        }
    };

    const onCreate = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            await errorAlert('Datos incompletos', 'Ingresa email y contraseña');
            return;
        }
        const ok = await confirmAlert(
            'Crear usuario',
            `¿Deseas crear el usuario ${form.email}?`,
            'Crear',
            'Cancelar',
            'question'
        );
        if (!ok) return;
        try {
            setCreating(true);
            await http.postData('/auth/register-sale', form);
            await successAlert('Usuario creado', 'El usuario fue registrado y activado correctamente');
            setShowForm(false);
            setForm({ email: '', password: '', daysToAdd: 90 });
            setPagination((p) => ({ ...p, pageIndex: 0 }));
            fetchUsers();
        } catch (e) {
            await errorAlert('Error', e?.response?.data?.message || 'No se pudo crear el usuario');
        } finally {
            setCreating(false);
        }
    };

    // Open user detail modal
    const openUserDetail = async (userId) => {
        setDetailOpen(true);
        setDetailUser(null);
        setDetailLoading(true);
        try {
            const res = await http.getData(`/users/${userId}`);
            setDetailUser(res.data);
        } catch (e) {
            console.error('Error loading user detail', e);
        } finally {
            setDetailLoading(false);
        }
    };

    const columns = useMemo(
        () => [
            { accessorKey: 'id', header: 'ID', size: 70 },
            { accessorKey: 'email', header: 'Email', size: 260 },
            {
                accessorKey: 'isActive',
                header: 'Activo',
                size: 90,
                Cell: ({ cell }) => (
                    <Chip
                        label={cell.getValue() ? '✓' : '✗'}
                        size="small"
                        sx={{
                            backgroundColor: cell.getValue() ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                            color: cell.getValue() ? '#22c55e' : '#ef4444',
                            fontWeight: 700,
                            fontSize: '.75rem',
                            height: 24,
                        }}
                    />
                ),
            },
            { accessorKey: 'downloadCount', header: 'Descargas', size: 100 },
            { accessorKey: 'subEnds', header: 'Termina', size: 120 },
            { accessorKey: 'subDaysLeft', header: 'Días rest.', size: 100 },
        ],
        []
    );

    const table = useMaterialReactTable({
        columns,
        data,
        rowCount,
        state: { isLoading: loading, pagination },
        manualPagination: true,
        onPaginationChange: setPagination,
        initialState: { density: 'compact' },
        muiToolbarAlertBannerProps: error ? { color: 'error', children: error } : undefined,
        muiTablePaperProps: {
            sx: { backgroundColor: 'rgba(0, 0, 0, 0)', boxShadow: 'none', border: 'none' },
        },
        muiTopToolbarProps: { sx: { backgroundColor: 'rgba(0, 0, 0, 0)' } },
        muiBottomToolbarProps: { sx: { backgroundColor: 'rgba(0, 0, 0, 0)' } },
        renderTopToolbarCustomActions: () => (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                <TextField
                    size="small"
                    placeholder="Buscar email..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setPagination(p => ({ ...p, pageIndex: 0 })); setSearchTerm(q); } }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ minWidth: 260 }}
                />
                <MUIButton variant="outlined" onClick={() => { setPagination(p => ({ ...p, pageIndex: 0 })); setSearchTerm(q); }}>
                    Buscar
                </MUIButton>
                <Box sx={{ flex: 1 }} />
                <MUIButton variant="contained" color="success" onClick={() => setShowForm(true)}>
                    Crear usuario
                </MUIButton>
            </Box>
        ),
        displayColumnDefOptions: {
            'mrt-row-actions': {
                header: 'Acciones',
                size: 90,
                muiTableHeadCellProps: { align: 'center' },
                muiTableBodyCellProps: { align: 'center', sx: { py: 0.3 } },
            },
        },
        enableRowActions: true,
        positionActionsColumn: 'first',
        renderRowActions: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
                <Tooltip title="Extender suscripción">
                    <IconButton onClick={() => onUpdate(row)} size="small" sx={{ p: 0.5 }}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                {row.original.roleId !== 2 && (
                    <Tooltip title="Eliminar">
                        <IconButton color="error" onClick={() => onDelete(row)} size="small" sx={{ p: 0.5 }}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        ),
        muiTableBodyRowProps: ({ row }) => ({
            onClick: () => openUserDetail(row.original.id),
            sx: { cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(167,139,250,0.08)' } },
        }),
        muiTableContainerProps: { sx: { height: { xs: 'calc(100vh - 260px)', md: 'calc(100vh - 260px)' }, overflowX: 'auto' } },
        enableStickyHeader: true,
        enableStickyFooter: true,
        muiPaginationProps: {
            rowsPerPageOptions: [10, 25, 50, 100, 200, 300, 400, 500, 1000],
        },
    });

    const du = detailUser;
    const sub = du?.subscription;

    return (
        <>
            <Box component="h2" sx={{ mb: 2, textAlign: 'center', color: '#f8fafc', fontWeight: 800 }}>
                Users
            </Box>

            {/* Modal Crear usuario */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} fullWidth maxWidth="sm">
                <DialogTitle>Crear usuario</DialogTitle>
                <Box component="form" onSubmit={onCreate}>
                    <DialogContent dividers>
                        <TextField label="Email" type="email" fullWidth required margin="dense" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <TextField label="Password" type="text" fullWidth required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
                            <MUIButton type="button" variant="outlined" onClick={() => setForm(f => ({ ...f, password: generateStrongPassword(12) }))} disabled={creating}>Generar</MUIButton>
                        </Box>
                        <TextField label="Días de suscripción a añadir" type="number" fullWidth required margin="dense" inputProps={{ min: 1, max: 3650 }} value={form.daysToAdd} onChange={(e) => setForm(f => ({ ...f, daysToAdd: Number(e.target.value) }))} />
                    </DialogContent>
                    <DialogActions>
                        <MUIButton onClick={() => setShowForm(false)} disabled={creating}>Cancelar</MUIButton>
                        <MUIButton type="submit" variant="contained" disabled={creating}>{creating ? 'Creando...' : 'Crear usuario'}</MUIButton>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Modal Detalle de usuario */}
            <Dialog
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
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
                    <IconButton onClick={() => setDetailOpen(false)} size="small" sx={{ color: '#94a3b8' }}>
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

            <MaterialReactTable table={table} />
        </>
    );
}
