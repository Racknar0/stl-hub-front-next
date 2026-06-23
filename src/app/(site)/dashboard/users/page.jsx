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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import UserDetailModal from '../../../../components/dashboard/modules/UserDetailModal/UserDetailModal';

export default function UsersPage() {
    const http = new HttpService();

    const [data, setData] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 500 });
    const [q, setQ] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form create
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', daysToAdd: 90, roleId: 1 });

    // Form edit
    const [showEditForm, setShowEditForm] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        id: null,
        email: '',
        password: '',
        roleId: 1,
        isActive: true,
        daysRemaining: 0,
    });

    // User detail modal
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [maxRolls, setMaxRolls] = useState(3);

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
            if (payload && typeof payload.maxRolls === 'number') {
                setMaxRolls(payload.maxRolls);
            }
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

    const onEdit = (row) => {
        const u = row.original;
        setEditForm({
            id: u.id,
            email: u.email || '',
            password: '',
            roleId: u.roleId || 1,
            isActive: u.isActive !== false,
            daysRemaining: u.subDaysLeft !== null && u.subDaysLeft !== undefined ? Math.max(0, u.subDaysLeft) : 0,
        });
        setShowEditForm(true);
    };

    const onSaveEdit = async (e) => {
        e.preventDefault();
        if (!editForm.email) {
            await errorAlert('Datos incompletos', 'Ingresa el email');
            return;
        }
        const ok = await confirmAlert(
            'Actualizar usuario',
            `¿Deseas guardar los cambios para el usuario ${editForm.email}?`,
            'Guardar',
            'Cancelar',
            'question'
        );
        if (!ok) return;

        try {
            setEditing(true);
            const promises = [];

            // 1. Update basic user info
            const updateData = {
                email: editForm.email,
                isActive: editForm.isActive,
                roleId: editForm.roleId,
            };
            if (editForm.password) {
                updateData.password = editForm.password;
            }
            promises.push(http.putData('/users', editForm.id, updateData));

            // 2. Update subscription days remaining
            if (editForm.daysRemaining !== '' && editForm.daysRemaining !== null && editForm.daysRemaining !== undefined) {
                promises.push(
                    http.postData(`/users/${editForm.id}/subscription/extend`, {
                        daysRemaining: Number(editForm.daysRemaining),
                    })
                );
            }

            await Promise.all(promises);
            await successAlert('Usuario actualizado', 'El usuario se actualizó correctamente');
            setShowEditForm(false);
            fetchUsers();
        } catch (err) {
            await errorAlert('Error', err?.response?.data?.message || 'No se pudo actualizar el usuario');
        } finally {
            setEditing(false);
        }
    };

    const handleResetRolls = async () => {
        if (!editForm.id) return;
        const ok = await confirmAlert(
            'Reiniciar Tiradas',
            `¿Deseas reiniciar las tiradas diarias del usuario ${editForm.email} para el día de hoy?`,
            'Reiniciar',
            'Cancelar',
            'warning'
        );
        if (!ok) return;

        try {
            setEditing(true);
            await http.postData(`/users/${editForm.id}/freebie-rolls/reset`, {});
            await successAlert('Tiradas reiniciadas', 'Las tiradas diarias del usuario se reiniciaron correctamente.');
        } catch (err) {
            await errorAlert('Error', err?.response?.data?.message || 'No se pudieron reiniciar las tiradas');
        } finally {
            setEditing(false);
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
            setForm({ email: '', password: '', daysToAdd: 90, roleId: 1 });
            setPagination((p) => ({ ...p, pageIndex: 0 }));
            fetchUsers();
        } catch (e) {
            await errorAlert('Error', e?.response?.data?.message || 'No se pudo crear el usuario');
        } finally {
            setCreating(false);
        }
    };

    // Open user detail modal
    const openUserDetail = (userId) => {
        setSelectedUserId(userId);
        setDetailOpen(true);
    };

    // Helper: código ISO 2 letras → emoji de bandera ("CO" → "🇨🇴", "US" → "🇺🇸")
    const countryFlag = (code) => {
        if (!code || code.length !== 2) return '';
        return String.fromCodePoint(
            ...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
        );
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
            {
                accessorKey: 'rollsUsed',
                header: 'Tiradas rest.',
                size: 130,
                Cell: ({ row }) => {
                    const rollsUsed = Number(row.original.rollsUsed ?? 0);
                    const remaining = Math.max(0, maxRolls - rollsUsed);
                    const ratio = remaining / maxRolls;

                    let color = '#ef4444'; // rojo
                    if (ratio === 1) {
                        color = '#22c55e'; // verde
                    } else if (ratio >= 0.5) {
                        color = '#eab308'; // amarillo/naranja
                    } else if (ratio > 0) {
                        color = '#f97316'; // naranja
                    }

                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box
                                sx={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: color,
                                    marginRight: 1,
                                    boxShadow: `0 0 6px ${color}`,
                                }}
                            />
                            <span>{remaining} / {maxRolls}</span>
                        </Box>
                    );
                }
            },
            { accessorKey: 'downloadCount', header: 'Descargas', size: 100 },
            {
                id: 'registerIpCountry',
                header: 'IP Registro',
                size: 140,
                Cell: ({ row }) => {
                    const ip = row.original.registerIp;
                    const code = row.original.registerCountry;
                    if (!ip && !code) return <span style={{ color: '#64748b' }}>—</span>;
                    return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                {ip || '—'}
                            </span>
                            {code ? (
                                <span style={{ fontSize: '1rem', cursor: 'default', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {countryFlag(code)} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{code}</span>
                                </span>
                            ) : null}
                        </Box>
                    );
                },
            },
            {
                id: 'lastLoginIpCountry',
                header: 'Último Login',
                size: 140,
                Cell: ({ row }) => {
                    const ip = row.original.lastLoginIp;
                    const code = row.original.lastLoginCountry;
                    if (!ip && !code) return <span style={{ color: '#64748b' }}>—</span>;
                    return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                {ip || '—'}
                            </span>
                            {code ? (
                                <span style={{ fontSize: '1rem', cursor: 'default', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {countryFlag(code)} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{code}</span>
                                </span>
                            ) : null}
                        </Box>
                    );
                },
            },
            { accessorKey: 'subEnds', header: 'Termina', size: 120 },
            { accessorKey: 'subDaysLeft', header: 'Días rest.', size: 100 },
        ],
        [maxRolls]
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
                <Tooltip title="Editar usuario">
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(row);
                        }}
                        size="small"
                        sx={{ p: 0.5 }}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                {row.original.roleId !== 2 && (
                    <Tooltip title="Eliminar">
                        <IconButton
                            color="error"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(row);
                            }}
                            size="small"
                            sx={{ p: 0.5 }}
                        >
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



    return (
        <>
            <Box component="h2" sx={{ mb: 2, textAlign: 'center', color: '#f8fafc', fontWeight: 800 }}>
                Users
            </Box>

            {/* Modal Crear usuario */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} fullWidth maxWidth="sm">
                <DialogTitle>Crear usuario</DialogTitle>
                <Box component="form" onSubmit={onCreate}>
                    <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Email" type="email" fullWidth required value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <TextField label="Password" type="text" fullWidth required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
                            <MUIButton type="button" variant="outlined" sx={{ mt: 0, height: 56 }} onClick={() => setForm(f => ({ ...f, password: generateStrongPassword(12) }))} disabled={creating}>Generar</MUIButton>
                        </Box>
                        <FormControl fullWidth>
                            <InputLabel id="create-role-label">Rol</InputLabel>
                            <Select
                                labelId="create-role-label"
                                label="Rol"
                                value={form.roleId}
                                onChange={(e) => setForm(f => ({ ...f, roleId: Number(e.target.value) }))}
                            >
                                <MenuItem value={1}>Usuario</MenuItem>
                                <MenuItem value={2}>Admin</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label="Días de suscripción a añadir" type="number" fullWidth required inputProps={{ min: 1, max: 3650 }} value={form.daysToAdd} onChange={(e) => setForm(f => ({ ...f, daysToAdd: Number(e.target.value) }))} />
                    </DialogContent>
                    <DialogActions>
                        <MUIButton onClick={() => setShowForm(false)} disabled={creating}>Cancelar</MUIButton>
                        <MUIButton type="submit" variant="contained" disabled={creating}>{creating ? 'Creando...' : 'Crear usuario'}</MUIButton>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Modal Editar usuario */}
            <Dialog open={showEditForm} onClose={() => setShowEditForm(false)} fullWidth maxWidth="sm">
                <DialogTitle>Editar usuario</DialogTitle>
                <Box component="form" onSubmit={onSaveEdit}>
                    <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            required
                            margin="dense"
                            value={editForm.email}
                            onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                        />
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                label="Nueva Password (opcional)"
                                type="text"
                                fullWidth
                                placeholder="Dejar en blanco para no cambiar"
                                value={editForm.password}
                                onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
                            />
                            <MUIButton
                                type="button"
                                variant="outlined"
                                sx={{ mt: 1, height: 56 }}
                                onClick={() => setEditForm(f => ({ ...f, password: generateStrongPassword(12) }))}
                                disabled={editing}
                            >
                                Generar
                            </MUIButton>
                        </Box>
                        
                        <FormControl fullWidth margin="dense">
                            <InputLabel id="edit-role-label">Rol</InputLabel>
                            <Select
                                labelId="edit-role-label"
                                label="Rol"
                                value={editForm.roleId}
                                onChange={(e) => setEditForm(f => ({ ...f, roleId: Number(e.target.value) }))}
                            >
                                <MenuItem value={1}>Usuario</MenuItem>
                                <MenuItem value={2}>Admin</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="dense">
                            <InputLabel id="edit-status-label">Estado</InputLabel>
                            <Select
                                labelId="edit-status-label"
                                label="Estado"
                                value={editForm.isActive ? 'active' : 'inactive'}
                                onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.value === 'active' }))}
                            >
                                <MenuItem value="active">Activo</MenuItem>
                                <MenuItem value="inactive">Inactivo</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Días de suscripción restantes"
                            type="number"
                            fullWidth
                            margin="dense"
                            inputProps={{ min: 0, max: 3650 }}
                            value={editForm.daysRemaining !== '' && editForm.daysRemaining !== null && editForm.daysRemaining !== undefined ? editForm.daysRemaining : ''}
                            onChange={(e) => setEditForm(f => ({ ...f, daysRemaining: e.target.value === '' ? '' : Number(e.target.value) }))}
                            helperText="Días restantes de suscripción. Pon 0 para quitarla o inhabilitarla."
                        />

                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>Tiradas de Freebies</Box>
                                <Box component="span" sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>Restablecer el límite del día actual para este usuario.</Box>
                            </Box>
                            <MUIButton
                                type="button"
                                variant="outlined"
                                color="warning"
                                onClick={handleResetRolls}
                                disabled={editing}
                                size="small"
                                sx={{ flexShrink: 0 }}
                            >
                                Reiniciar Tiradas
                            </MUIButton>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <MUIButton onClick={() => setShowEditForm(false)} disabled={editing}>
                            Cancelar
                        </MUIButton>
                        <MUIButton type="submit" variant="contained" color="primary" disabled={editing}>
                            {editing ? 'Guardando...' : 'Guardar Cambios'}
                        </MUIButton>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Modal Detalle de usuario (Reusable) */}
            <UserDetailModal
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                userId={selectedUserId}
            />

            <MaterialReactTable table={table} />
        </>
    );
}
