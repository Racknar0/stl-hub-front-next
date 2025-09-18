'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import HttpService from '../../../../services/HttpService';
import {
    successAlert,
    errorAlert,
    confirmAlert,
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';

export default function UsersPage() {
    const http = new HttpService();

    // Tabla state
    const [data, setData] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    // Un solo estado para paginación (requerido por MRT)
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [globalFilter, setGlobalFilter] = useState('');
    const [debouncedFilter, setDebouncedFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form create
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
        type_subscription: 'three_months',
    });

    // Debounce 2s para buscador
    useEffect(() => {
        const t = setTimeout(() => {
            setPagination((p) => ({ ...p, pageIndex: 0 }));
            setDebouncedFilter(globalFilter);
        }, 2000);
        return () => clearTimeout(t);
    }, [globalFilter]);

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
            const size = Math.max(Number(pagination.pageSize) ?? 50, 50);
            const res = await http.getData(
                `/users?page=${page + 1}&pageSize=${size}&q=${encodeURIComponent(debouncedFilter)}`
            );
            const payload = res.data;
            setData(
                (payload.data || []).map((u) => {
                    const sub = u.subscriptions?.[0];
                    const now = new Date();
                    const end = sub ? new Date(sub.currentPeriodEnd) : null;
                    const started = sub ? new Date(sub.startedAt) : null;
                    const daysRemaining = end
                        ? Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
                        : null;
                    let period;
                    if (started && end) {
                        const months =
                            (end.getFullYear() - started.getFullYear()) * 12 +
                            (end.getMonth() - started.getMonth());
                        period = `${months} meses`;
                    } else {
                        period = '—';
                    }
                    return {
                        ...u,
                        subPeriod: period,
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
    }, [pagination, debouncedFilter]);

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
            await successAlert(
                'Usuario eliminado',
                'El usuario se eliminó correctamente'
            );
            // refetch current page
            fetchUsers();
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message || 'No se pudo eliminar el usuario'
            );
        }
    };

    const onUpdate = async (row) => {
        const u = row.original;
        // Pedir meses a extender
        const monthsStr = prompt(
            '¿Cuántos meses deseas extender? (3, 6, 12)',
            '3'
        );
        const months = Number(monthsStr);
        if (![3, 6, 12].includes(months)) return;
        try {
            await http.postData(
                `/users/${u.id}/subscription/extend`,
                { months }
            );
            await successAlert(
                'Suscripción actualizada',
                'Se extendió la suscripción correctamente'
            );
            fetchUsers();
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message || 'No se pudo actualizar la suscripción'
            );
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
            await successAlert(
                'Usuario creado',
                'El usuario fue registrado y activado correctamente'
            );
            setShowForm(false);
            setForm({
                email: '',
                password: '',
                type_subscription: 'three_months',
            });
            // ir a primera página para verlo
            setPagination((p) => ({ ...p, pageIndex: 0 }));
            fetchUsers();
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message || 'No se pudo crear el usuario'
            );
        } finally {
            setCreating(false);
        }
    };

    const columns = useMemo(
        () => [
            { accessorKey: 'id', header: 'ID', size: 80 },
            { accessorKey: 'email', header: 'Email', size: 320 },
            { accessorKey: 'subPeriod', header: 'Periodo', size: 120 },
            { accessorKey: 'subEnds', header: 'Termina', size: 140 },
            { accessorKey: 'subDaysLeft', header: 'Días restantes', size: 140 },
        ],
        []
    );

    const table = useMaterialReactTable({
        columns,
        data,
        rowCount,
        state: {
            isLoading: loading,
            pagination,
            globalFilter,
        },
        manualPagination: true,
        manualFiltering: true,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        initialState: { density: 'compact' },
        muiToolbarAlertBannerProps: error
            ? { color: 'error', children: error }
            : undefined,
        renderTopToolbarCustomActions: () => (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Buscar email..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <MUIButton
                    variant="contained"
                    color="success"
                    onClick={() => setShowForm(true)}
                >
                    Crear usuario
                </MUIButton>
            </Box>
        ),
        displayColumnDefOptions: {
            'mrt-row-actions': { header: 'Acciones', size: 130 },
        },
        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActions: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Extender suscripción">
                    <IconButton onClick={() => onUpdate(row)} size="small">
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                {/* Ocultar eliminar si admin */}
                {row.original.roleId !== 2 && (
                    <Tooltip title="Eliminar">
                        <IconButton
                            color="error"
                            onClick={() => onDelete(row)}
                            size="small"
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        ),
        muiTableContainerProps: { sx: { maxHeight: 600 } },
        enableStickyHeader: true,
        enableStickyFooter: true,
    });

    return (
        <div className="dashboard-content p-3">
            <h2 className="mb-3 text-center">Users</h2>

            {/* Modal Crear usuario */}
            <Dialog open={showForm} onClose={() => setShowForm(false)} fullWidth maxWidth="sm">
                <DialogTitle>Crear usuario</DialogTitle>
                <Box component="form" onSubmit={onCreate}>
                    <DialogContent dividers>
                        <TextField label="Email" type="email" fullWidth required margin="dense" value={form.email} onChange={(e)=>setForm(f=>({...f, email: e.target.value}))} />
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <TextField label="Password" type="text" fullWidth required value={form.password} onChange={(e)=>setForm(f=>({...f, password: e.target.value}))} />
                            <MUIButton type="button" variant="outlined" onClick={() => setForm(f=>({...f, password: generateStrongPassword(12)}))} disabled={creating}>Generar</MUIButton>
                        </Box>
                        <FormControl fullWidth margin="dense">
                            <InputLabel id="sub-label">Suscripción</InputLabel>
                            <Select labelId="sub-label" label="Suscripción" value={form.type_subscription} onChange={(e)=>setForm(f=>({...f, type_subscription: e.target.value}))}>
                                <MenuItem value="three_months">3 meses</MenuItem>
                                <MenuItem value="six_months">6 meses</MenuItem>
                                <MenuItem value="one_year">1 año</MenuItem>
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <MUIButton onClick={() => setShowForm(false)} disabled={creating}>Cancelar</MUIButton>
                        <MUIButton type="submit" variant="contained" disabled={creating}>{creating ? 'Creando...' : 'Crear usuario'}</MUIButton>
                    </DialogActions>
                </Box>
            </Dialog>

            <div className="card glass p-3">
                <MaterialReactTable table={table} />
            </div>
        </div>
    );
}
