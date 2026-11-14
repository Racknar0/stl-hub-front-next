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
import AddOutlined from '@mui/icons-material/AddOutlined';
import UserRowActions from './UserRowActions';
import UserLocation, { countryName } from '@/components/dashboard/UserLocation';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import UserDetailModal from '../../../../components/dashboard/modules/UserDetailModal/UserDetailModal';

export default function UsersPage() {
    const http = useMemo(() => new HttpService(), []);

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
    }, [http, pagination, searchTerm]);

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

    const columns = useMemo(() => [
        {
            accessorKey: 'email', header: 'Usuario', size: 330,
            Cell: ({ row }) => <Box sx={{ minWidth: 0 }}>
                <Box sx={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.original.email}>{row.original.email}</Box>
                <Box sx={{ fontSize: 10, color: '#7b91aa', mt: .3 }}>#{row.original.id} · {row.original.roleId === 2 ? 'Administrador' : 'Usuario'}{row.original.createdAt ? ` · Alta ${new Date(row.original.createdAt).toLocaleDateString('es-CO')}` : ''}</Box>
            </Box>,
        },
        {
            accessorKey: 'isActive', header: 'Estado', size: 115, filterVariant: 'select',
            filterSelectOptions: [{ label: 'Activo', value: 'true' }, { label: 'Inactivo', value: 'false' }],
            Cell: ({ cell }) => <Box component="span" sx={{ display: 'inline-flex', gap: .7, alignItems: 'center', fontSize: 11, color: cell.getValue() ? '#6ee7b7' : '#fda4af' }}><Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor' }} />{cell.getValue() ? 'Activo' : 'Inactivo'}</Box>,
        },
        {
            id: 'subscription', header: 'Suscripción', size: 210,
            accessorFn: user => user.subDaysLeft > 0 ? 'Premium' : user.subDaysLeft === null ? 'Gratis' : 'Vencida',
            filterVariant: 'select', filterSelectOptions: ['Premium', 'Gratis', 'Vencida'],
            Cell: ({ row, cell }) => {
                const days = row.original.subDaysLeft;
                const color = days !== null && days <= 7 ? days === 0 ? '#fb7185' : '#fbbf24' : '#cbd5e1';
                return <Box><Box sx={{ color, fontSize: 12 }}>{cell.getValue()}{days > 0 ? ` · ${days} días` : ''}</Box>
                    {days !== null && <Box sx={{ color: '#7b91aa', fontSize: 10, mt: .3 }}>{days === 0 ? 'Venció' : 'Vence'} {row.original.subEnds}</Box>}
                </Box>;
            },
        },
        {
            accessorKey: 'downloadCount', header: 'Descargas', size: 110,
            Cell: ({ cell }) => <Box sx={{ fontSize: 12, color: '#cbd5e1' }}>{Number(cell.getValue() || 0).toLocaleString('es-CO')}</Box>,
        },
        {
            id: 'rollsRemaining', header: 'Tiradas rest.', size: 130,
            accessorFn: user => Math.max(0, maxRolls - Number(user.rollsUsed || 0)),
            Cell: ({ row, cell }) => {
                const used = Number(row.original.rollsUsed || 0);
                const remaining = cell.getValue();
                const color = remaining === 0 ? '#fb7185' : used > 0 ? '#fbbf24' : '#4ade80';
                return <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: .7, fontSize: 12, color }}><Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color }} />{remaining} / {maxRolls}</Box>;
            },
        },
        {
            id: 'registerIpCountry', header: 'IP Registro', size: 170,
            accessorFn: user => `${user.registerCountry ? countryName(user.registerCountry) : ''} ${user.registerIp || ''}`.trim(),
            sortingFn: 'alphanumeric',
            Cell: ({ row }) => <UserLocation ip={row.original.registerIp} country={row.original.registerCountry} />,
        },
        {
            id: 'lastLoginIpCountry', header: 'Último Login', size: 170,
            accessorFn: user => `${user.lastLoginCountry ? countryName(user.lastLoginCountry) : ''} ${user.lastLoginIp || ''}`.trim(),
            sortingFn: 'alphanumeric',
            Cell: ({ row }) => <UserLocation ip={row.original.lastLoginIp} country={row.original.lastLoginCountry} />,
        },
    ], [maxRolls]);

    const table = useMaterialReactTable({
        columns,
        data,
        localization: MRT_Localization_ES,
        enableColumnActions: false,
        enableColumnOrdering: true,
        enableDensityToggle: false,
        enableFullScreenToggle: false,
        enableGlobalFilter: false,
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
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
                    sx={{ width: { xs: '100%', sm: 300 }, '& .MuiInputBase-root': { fontSize: 12 } }}
                />
                <MUIButton size="small" sx={{ textTransform: 'none' }} variant="outlined" onClick={() => { setPagination(p => ({ ...p, pageIndex: 0 })); setSearchTerm(q); }}>
                    Buscar
                </MUIButton>
                <Box sx={{ flex: 1 }} />
                <MUIButton variant="contained" size="small" startIcon={<AddOutlined />} sx={{ textTransform: 'none', bgcolor: '#38bdf8', color: '#082f49', boxShadow: 'none' }} onClick={() => setShowForm(true)}>
                    Crear usuario
                </MUIButton>
            </Box>
        ),
        displayColumnDefOptions: {
            'mrt-row-actions': {
                header: 'Acciones',
                size: 125,
                muiTableHeadCellProps: { align: 'center' },
                muiTableBodyCellProps: { align: 'center', sx: { py: 0.3 } },
            },
        },
        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActions: ({ row }) => <UserRowActions row={row} onView={openUserDetail} onEdit={onEdit} onDelete={onDelete} />,
        muiTableBodyRowProps: ({ row }) => ({
            onClick: () => openUserDetail(row.original.id),
            sx: { cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(56,189,248,0.04)' } },
        }),
        muiTableContainerProps: { sx: { height: { xs: 'calc(100dvh - 190px)', md: 'calc(100dvh - 190px)' }, overflowX: 'auto' } },
        muiTableHeadCellProps: { sx: { fontSize: 11, color: '#94a3b8', py: 1, backgroundColor: '#0b1422' } },
        muiTableBodyCellProps: { sx: { py: .8, borderColor: 'rgba(148,163,184,.12)' } },
        enableRowVirtualization: true,
        rowVirtualizerOptions: { overscan: 5, estimateSize: () => 52 },
        enableStickyHeader: true,
        enableStickyFooter: true,
        muiPaginationProps: {
            rowsPerPageOptions: [10, 25, 50, 100, 200, 300, 400, 500, 1000],
        },
    });



    return (
        <>

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
