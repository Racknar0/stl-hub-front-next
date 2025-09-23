'use client';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import HttpService from '../../../../services/HttpService';
import {
    successAlert,
    errorAlert,
    confirmAlert,
} from '../../../../helpers/alerts';
import Swal from 'sweetalert2';
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
    InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';

export default function UsersPage() {
    const http = new HttpService();

    // Tabla state
    const [data, setData] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    // Un solo estado para paginación (requerido por MRT)
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [q, setQ] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form create
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
        daysToAdd: 90,
    });

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
                    const started = sub ? new Date(sub.startedAt) : null;
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
        const result = await Swal.fire({
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
            await http.postData(
                `/users/${u.id}/subscription/extend`,
                { daysToAdd }
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
                daysToAdd: 90,
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
            { accessorKey: 'id', header: 'ID', size: 70 },
            { accessorKey: 'email', header: 'Email', size: 300 },
            { accessorKey: 'downloadCount', header: 'Descargas', size: 110 },
            { accessorKey: 'subEnds', header: 'Termina', size: 130 },
            { accessorKey: 'subDaysLeft', header: 'Días restantes', size: 130 },
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
        },
        manualPagination: true,
        onPaginationChange: setPagination,
        initialState: { density: 'compact' },
        muiToolbarAlertBannerProps: error
            ? { color: 'error', children: error }
            : undefined,
        renderTopToolbarCustomActions: () => (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                <TextField
                    size="small"
                    placeholder="Buscar email..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==='Enter'){ setPagination(p=>({...p, pageIndex:0})); setSearchTerm(q); } }}
                    InputProps={{ startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                        </InputAdornment>
                    ) }}
                    sx={{ minWidth: 260 }}
                />
                <MUIButton
                    variant="outlined"
                    onClick={() => { setPagination(p=>({...p, pageIndex:0})); setSearchTerm(q); }}
                >
                    Buscar
                </MUIButton>
                <Box sx={{ flex: 1 }} />
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
        muiTableContainerProps: { sx: { height: { xs: 'calc(100vh - 260px)', md: 'calc(100vh - 260px)' }, overflowX: 'auto' } },
        enableStickyHeader: true,
        enableStickyFooter: true,
        muiPaginationProps: {
            rowsPerPageOptions: [10, 25, 50, 100, 200, 300, 400, 500, 1000],
        },
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
                        <TextField
                            label="Días de suscripción a añadir"
                            type="number"
                            fullWidth
                            required
                            margin="dense"
                            inputProps={{ min: 1, max: 3650 }}
                            value={form.daysToAdd}
                            onChange={(e)=> setForm(f=> ({...f, daysToAdd: Number(e.target.value) }))}
                        />
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
