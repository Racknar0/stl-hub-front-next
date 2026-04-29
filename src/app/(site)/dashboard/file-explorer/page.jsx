'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import HttpService from '@/services/HttpService';
import {
    Box, Typography, Breadcrumbs, Link, Button, IconButton,
    Menu, MenuItem, ListItemIcon, ListItemText,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Select, FormControl, InputLabel, Tooltip, ToggleButtonGroup, ToggleButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Slider
} from '@mui/material';
import {
    Folder as FolderIcon,
    InsertDriveFile as FileIcon,
    MoreVert as MoreVertIcon,
    CreateNewFolder as CreateNewFolderIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    DriveFileRenameOutline as RenameIcon,
    DriveFileMove as MoveIcon,
    NavigateNext as NavigateNextIcon,
    GridView as GridViewIcon,
    ViewList as ViewListIcon,
    Image as ImageIcon,
    Archive as ArchiveIcon,
    Description as DescriptionIcon,
    ViewInAr as ViewInArIcon
} from '@mui/icons-material';

export default function FileExplorerPage() {
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState('/');
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [gridIconSize, setGridIconSize] = useState(60);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    
    // Dialog states
    const [dialogMode, setDialogMode] = useState(null); // 'createFolder', 'rename', 'move'
    const [dialogInput, setDialogInput] = useState('');
    const [moveDestination, setMoveDestination] = useState('/');
    const [foldersList, setFoldersList] = useState([]); // para el select de move

    const http = useMemo(() => new HttpService(), []);

    const loadFiles = useCallback(async (path = '/') => {
        try {
            const res = await http.getData(`/file-explorer/list?path=${encodeURIComponent(path)}`);
            if (res.data?.success) {
                // Ordenar: carpetas primero
                const sortedFiles = res.data.files.sort((a, b) => {
                    if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
                    return a.isDir ? -1 : 1;
                });
                setFiles(sortedFiles);
                setCurrentPath(path);
            } else {
                alert(res.data?.message || 'Error cargando archivos');
            }
        } catch (error) {
            console.error('Error loadFiles:', error);
            alert('Error de conexión');
        }
    }, [http]);

    useEffect(() => {
        loadFiles('/');
    }, [loadFiles]);

    // Obtener lista plana de carpetas para el move
    const loadAllFolders = async (currentPath, filesInCurrent) => {
        // Podríamos hacer un endpoint recursivo, pero por ahora mostramos el root y los de nivel actual
        // Para algo simple, dejaremos que el usuario mueva a la carpeta raíz o subcarpetas visibles.
        // Lo ideal sería un endpoint de "tree", pero por ahora improvisaremos.
        try {
            const res = await http.getData(`/file-explorer/list?path=/`);
            let roots = [{ id: '/', name: 'Raíz (uploads)' }];
            if (res.data?.success) {
                const subDirs = res.data.files.filter(f => f.isDir).map(f => ({ id: f.id, name: f.id }));
                setFoldersList([...roots, ...subDirs]);
            }
        } catch(e) {}
    };

    const handleMenuClick = (event, file) => {
        event.stopPropagation();
        setSelectedFile(file);
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleItemDoubleClick = (file) => {
        if (file.isDir) {
            loadFiles(file.id);
        }
    };

    const handleBreadcrumbClick = (e, path) => {
        e.preventDefault();
        loadFiles(path);
    };

    const handleDelete = async () => {
        handleMenuClose();
        if (confirm(`¿Borrar "${selectedFile.name}" permanentemente?`)) {
            await http.postData('/file-explorer/delete', { files: [selectedFile.id] });
            loadFiles(currentPath);
        }
    };

    const openDialog = (mode) => {
        setDialogMode(mode);
        if (mode === 'rename') setDialogInput(selectedFile.name);
        else if (mode === 'createFolder') setDialogInput('');
        else if (mode === 'move') {
            setMoveDestination('/');
            loadAllFolders();
        }
        handleMenuClose();
    };

    const closeDialog = () => setDialogMode(null);

    const submitDialog = async () => {
        try {
            if (dialogMode === 'createFolder') {
                if (!dialogInput) return;
                await http.postData('/file-explorer/create-folder', { currentPath, folderName: dialogInput });
            } else if (dialogMode === 'rename') {
                if (!dialogInput || dialogInput === selectedFile.name) return;
                await http.postData('/file-explorer/rename', { file: selectedFile.id, newName: dialogInput });
            } else if (dialogMode === 'move') {
                if (!moveDestination) return;
                await http.postData('/file-explorer/move', { files: [selectedFile.id], destination: moveDestination });
            }
            closeDialog();
            loadFiles(currentPath);
        } catch (e) {
            alert('Error en la operación');
        }
    };

    // Breadcrumbs logic
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'uploads', path: '/' }];
    let accum = '';
    for (const part of parts) {
        accum += `/${part}`;
        breadcrumbs.push({ label: part, path: accum });
    }

    // Helper to get file icon or thumbnail
    const getFileVisual = (file) => {
        const size = viewMode === 'grid' ? gridIconSize : 24;
        
        if (file.isDir) return <FolderIcon sx={{ color: '#60a5fa', fontSize: size }} />;
        
        const ext = file.name.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext);
        
        if (isImage) {
            const previewUrl = `${apiBase}/api/file-explorer/preview?path=${encodeURIComponent(file.id)}`;
            return (
                <Box 
                    component="img" 
                    src={previewUrl} 
                    alt={file.name} 
                    sx={{ 
                        width: size, 
                        height: size, 
                        objectFit: 'cover', 
                        borderRadius: '4px' 
                    }} 
                />
            );
        }

        const iconProps = { sx: { color: '#94a3b8', fontSize: size } };
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <ArchiveIcon {...iconProps} />;
        if (['stl', 'obj', 'fbx', 'blend'].includes(ext)) return <ViewInArIcon {...iconProps} />;
        if (['txt', 'md', 'json', 'pdf'].includes(ext)) return <DescriptionIcon {...iconProps} />;
        
        return <FileIcon {...iconProps} />;
    };

    return (
        <Box sx={{ p: 3, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                    Explorador de Archivos
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {viewMode === 'grid' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', width: 120, mr: 2 }}>
                                <ImageIcon fontSize="small" sx={{ color: '#64748b', mr: 1 }} />
                                <Slider
                                    size="small"
                                    value={gridIconSize}
                                    min={30}
                                    max={150}
                                    onChange={(e, v) => setGridIconSize(v)}
                                    aria-label="Grid Icon Size"
                                    sx={{ color: '#8b5cf6' }}
                                />
                            </Box>
                        )}
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(e, newMode) => newMode && setViewMode(newMode)}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.05)',
                                '& .MuiToggleButton-root': {
                                    color: '#64748b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    '&.Mui-selected': { color: 'white', bgcolor: 'rgba(139, 92, 246, 0.4)' }
                                }
                            }}
                        >
                            <ToggleButton value="grid" aria-label="grid view"><GridViewIcon fontSize="small" /></ToggleButton>
                            <ToggleButton value="list" aria-label="list view"><ViewListIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>

                        <Button 
                            variant="outlined" 
                            startIcon={<RefreshIcon />} 
                            onClick={() => loadFiles(currentPath)}
                        >
                            Recargar
                        </Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<CreateNewFolderIcon />}
                            onClick={() => openDialog('createFolder')}
                        >
                            Nueva Carpeta
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ 
                bgcolor: 'rgba(15, 23, 42, 0.65)', 
                backdropFilter: 'blur(12px)', 
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                p: 2, mb: 2 
            }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: '#64748b' }} />} aria-label="breadcrumb">
                    {breadcrumbs.map((bc, index) => (
                        <Link
                            key={bc.path}
                            underline="hover"
                            color={index === breadcrumbs.length - 1 ? 'white' : '#94a3b8'}
                            href="#"
                            onClick={(e) => handleBreadcrumbClick(e, bc.path)}
                            sx={{ fontWeight: index === breadcrumbs.length - 1 ? 600 : 400, cursor: 'pointer' }}
                        >
                            {bc.label}
                        </Link>
                    ))}
                </Breadcrumbs>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {files.length === 0 && (
                    <Typography sx={{ color: '#64748b', textAlign: 'center', mt: 5 }}>
                        La carpeta está vacía
                    </Typography>
                )}

                {files.length > 0 && viewMode === 'grid' && (
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(220, gridIconSize + 120)}px, 1fr))`, 
                        gap: 2 
                    }}>
                        {files.map((file) => (
                            <Box 
                                key={file.id} 
                                onDoubleClick={() => handleItemDoubleClick(file)}
                                sx={{
                                    position: 'relative',
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    p: 2,
                                    pt: 3,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    gap: 1,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.08)',
                                        borderColor: 'rgba(139, 92, 246, 0.5)',
                                        '& .action-menu': { opacity: 1 }
                                    }
                                }}
                            >
                                <Box sx={{ flexShrink: 0 }}>
                                    {getFileVisual(file)}
                                </Box>
                                
                                <Box sx={{ width: '100%' }}>
                                    <Typography 
                                        sx={{ 
                                            color: 'white', 
                                            fontWeight: 500,
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.3,
                                            mb: 0.5
                                        }}
                                    >
                                        {file.name}
                                    </Typography>
                                    {!file.isDir && file.size > 0 && (
                                        <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </Typography>
                                    )}
                                </Box>

                                <IconButton 
                                    className="action-menu"
                                    size="small" 
                                    onClick={(e) => handleMenuClick(e, file)}
                                    sx={{ 
                                        position: 'absolute', 
                                        top: 4, 
                                        right: 4, 
                                        color: '#64748b', 
                                        opacity: 0,
                                        transition: 'opacity 0.2s',
                                        '&:hover': { color: 'white' } 
                                    }}
                                >
                                    <MoreVertIcon />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}

                {files.length > 0 && viewMode === 'list' && (
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(15, 23, 42, 0.4)', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Nombre</TableCell>
                                    <TableCell align="right" sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Tamaño</TableCell>
                                    <TableCell align="right" sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Modificado</TableCell>
                                    <TableCell align="right" sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {files.map((file) => (
                                    <TableRow 
                                        key={file.id}
                                        onDoubleClick={() => handleItemDoubleClick(file)}
                                        sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                                            '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)' }
                                        }}
                                    >
                                        <TableCell sx={{ color: 'white' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {getFileVisual(file)}
                                                {file.name}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#94a3b8' }}>
                                            {!file.isDir ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '--'}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#94a3b8' }}>
                                            {file.modDate ? new Date(file.modDate).toLocaleDateString() : '--'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => handleMenuClick(e, file)}
                                                sx={{ color: '#64748b', '&:hover': { color: 'white' } }}
                                            >
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: { bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }
                }}
            >
                <MenuItem onClick={() => openDialog('rename')}>
                    <ListItemIcon><RenameIcon fontSize="small" sx={{ color: '#94a3b8' }} /></ListItemIcon>
                    <ListItemText>Renombrar</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => openDialog('move')}>
                    <ListItemIcon><MoveIcon fontSize="small" sx={{ color: '#94a3b8' }} /></ListItemIcon>
                    <ListItemText>Mover a...</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: '#ef4444' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                    <ListItemText>Eliminar</ListItemText>
                </MenuItem>
            </Menu>

            {/* Dialogs */}
            <Dialog 
                open={Boolean(dialogMode)} 
                onClose={closeDialog}
                PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minWidth: 400 } }}
            >
                <DialogTitle>
                    {dialogMode === 'createFolder' && 'Nueva Carpeta'}
                    {dialogMode === 'rename' && 'Renombrar'}
                    {dialogMode === 'move' && 'Mover Archivo'}
                </DialogTitle>
                <DialogContent>
                    {(dialogMode === 'createFolder' || dialogMode === 'rename') && (
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Nombre"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={dialogInput}
                            onChange={(e) => setDialogInput(e.target.value)}
                            sx={{ mt: 2, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                        />
                    )}
                    {dialogMode === 'move' && (
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel sx={{ color: '#94a3b8' }}>Carpeta destino</InputLabel>
                            <Select
                                value={moveDestination}
                                onChange={(e) => setMoveDestination(e.target.value)}
                                label="Carpeta destino"
                                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                            >
                                {foldersList.map(f => (
                                    <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={closeDialog} sx={{ color: '#94a3b8' }}>Cancelar</Button>
                    <Button onClick={submitDialog} variant="contained" color="primary">Aceptar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
