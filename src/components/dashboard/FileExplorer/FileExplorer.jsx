import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import HttpService from '@/services/HttpService';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    Box, Typography, Breadcrumbs, Link, Button, IconButton,
    Menu, MenuItem, ListItemIcon, ListItemText,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Select, FormControl, InputLabel, Tooltip, ToggleButtonGroup, ToggleButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Slider,
    CircularProgress
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
    ViewInAr as ViewInArIcon,
    Close as CloseIcon,
    DeleteSweep as PurgeIcon
} from '@mui/icons-material';

export default function FileExplorer({ initialPath = '/', isModal = false, onClose = null }) {
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [gridIconSize, setGridIconSize] = useState(60);
    const [loading, setLoading] = useState(false);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    
    const [dialogMode, setDialogMode] = useState(null);
    const [dialogInput, setDialogInput] = useState('');
    const [moveDestination, setMoveDestination] = useState('/');
    const [foldersList, setFoldersList] = useState([]);

    const parentRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (!parentRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(parentRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const http = useMemo(() => new HttpService(), []);

    const loadFiles = useCallback(async (path = '/') => {
        try {
            setLoading(true);
            const res = await http.getData(`/file-explorer/list?path=${encodeURIComponent(path)}`);
            if (res.data?.success) {
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
        } finally {
            setLoading(false);
        }
    }, [http]);

    useEffect(() => {
        loadFiles(initialPath);
    }, [loadFiles, initialPath]);

    const loadAllFolders = async () => {
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

    const handleMenuClose = () => setAnchorEl(null);

    const handleItemDoubleClick = (file) => {
        if (file.isDir) loadFiles(file.id);
    };

    const handleBreadcrumbClick = (e, path) => {
        e.preventDefault();
        loadFiles(path);
    };

    const handleDelete = async () => {
        handleMenuClose();
        if (confirm(`¿Borrar "${selectedFile.name}" permanentemente?`)) {
            try {
                const res = await http.postData('/file-explorer/delete', { files: [selectedFile.id] });
                if (res.data?.success === false) {
                    alert(`Error al borrar: ${res.data?.message || 'desconocido'}`);
                }
            } catch (e) {
                alert(`Error al borrar: ${e?.response?.data?.message || e.message}`);
            }
            loadFiles(currentPath);
        }
    };

    const handlePurge = async () => {
        handleMenuClose();
        if (!selectedFile?.isDir) return;
        if (confirm(`¿Purgar TODO el contenido de "${selectedFile.name}"?\n\nSe eliminarán todos los archivos y subcarpetas dentro, pero la carpeta se mantiene.`)) {
            try {
                const res = await http.postData('/file-explorer/purge', { folder: selectedFile.id });
                alert(res.data?.message || 'Carpeta purgada');
            } catch (e) {
                alert(`Error al purgar: ${e?.response?.data?.message || e.message}`);
            }
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

    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'uploads', path: '/' }];
    let accum = '';
    for (const part of parts) {
        accum += `/${part}`;
        breadcrumbs.push({ label: part, path: accum });
    }

    const formatSize = (bytes) => {
        if (!bytes || bytes <= 0) return '--';
        if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const getFileVisual = (file) => {
        const size = viewMode === 'grid' ? gridIconSize : 24;
        if (file.isDir) return <FolderIcon sx={{ color: '#60a5fa', fontSize: size }} />;
        
        const ext = file.name.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext);
        
        if (isImage) {
            const previewUrl = `${apiBase}/api/file-explorer/preview?path=${encodeURIComponent(file.id)}`;
            return <Box component="img" src={previewUrl} alt={file.name} sx={{ width: size, height: size, objectFit: 'cover', borderRadius: '4px' }} />;
        }

        const iconProps = { sx: { color: '#94a3b8', fontSize: size } };
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <ArchiveIcon {...iconProps} />;
        if (['stl', 'obj', 'fbx', 'blend'].includes(ext)) return <ViewInArIcon {...iconProps} />;
        if (['txt', 'md', 'json', 'pdf'].includes(ext)) return <DescriptionIcon {...iconProps} />;
        return <FileIcon {...iconProps} />;
    };

    // VIRTUALIZATION LOGIC
    const gap = 16;
    const itemWidth = Math.max(160, gridIconSize + 60);
    const columns = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
    const rowCount = Math.ceil(files.length / columns);
    const itemHeight = gridIconSize + 120;

    const gridVirtualizer = useVirtualizer({
        count: viewMode === 'grid' ? rowCount : 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemHeight + gap,
        overscan: 2,
    });

    const listVirtualizer = useVirtualizer({
        count: viewMode === 'list' ? files.length : 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 45, // approx height of table row
        overscan: 5,
    });

    return (
        <Box sx={{ p: isModal ? 2 : 3, height: isModal ? '80vh' : 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', bgcolor: isModal ? '#0f172a' : 'transparent', borderRadius: isModal ? '8px' : 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Typography variant={isModal ? 'h5' : 'h4'} sx={{ color: 'white', fontWeight: 600 }}>Explorador de Archivos</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {viewMode === 'grid' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', width: 120, mr: 1 }}>
                                <ImageIcon fontSize="small" sx={{ color: '#64748b', mr: 1 }} />
                                <Slider size="small" value={gridIconSize} min={30} max={150} onChange={(e, v) => setGridIconSize(v)} sx={{ color: '#8b5cf6' }} />
                            </Box>
                        )}
                        <ToggleButtonGroup value={viewMode} exclusive onChange={(e, newMode) => newMode && setViewMode(newMode)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', '& .MuiToggleButton-root': { color: '#64748b', border: '1px solid rgba(255,255,255,0.1)', '&.Mui-selected': { color: 'white', bgcolor: 'rgba(139, 92, 246, 0.4)' } } }}>
                            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
                            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>

                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadFiles(currentPath)}>Recargar</Button>
                        <Button variant="contained" color="primary" startIcon={<CreateNewFolderIcon />} onClick={() => openDialog('createFolder')}>Nueva Carpeta</Button>
                        {isModal && onClose && (
                            <IconButton onClick={onClose} sx={{ color: '#ef4444', ml: 1 }}><CloseIcon /></IconButton>
                        )}
                    </Box>
                </Box>
            </Box>

            <Box sx={{ bgcolor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(12px)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', p: 2, mb: 2 }}>
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: '#64748b' }} />}>
                    {breadcrumbs.map((bc, index) => (
                        <Link key={bc.path} underline="hover" color={index === breadcrumbs.length - 1 ? 'white' : '#94a3b8'} href="#" onClick={(e) => handleBreadcrumbClick(e, bc.path)} sx={{ fontWeight: index === breadcrumbs.length - 1 ? 600 : 400, cursor: 'pointer' }}>
                            {bc.label}
                        </Link>
                    ))}
                </Breadcrumbs>
            </Box>

            <Box ref={parentRef} sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                {loading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: 8, gap: 2 }}>
                        <CircularProgress size={40} sx={{ color: '#8b5cf6' }} />
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            {currentPath === '/' ? 'Calculando tamaño de carpetas...' : 'Cargando archivos...'}
                        </Typography>
                    </Box>
                )}

                {!loading && files.length === 0 && <Typography sx={{ color: '#64748b', textAlign: 'center', mt: 5 }}>La carpeta está vacía</Typography>}

                {!loading && files.length > 0 && viewMode === 'grid' && (
                    <Box sx={{ position: 'relative', width: '100%', height: `${gridVirtualizer.getTotalSize()}px` }}>
                        {gridVirtualizer.getVirtualItems().map((virtualRow) => {
                            const y = virtualRow.start;
                            return (
                                <Box key={virtualRow.key} sx={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${y}px)`, display: 'flex', gap: `${gap}px` }}>
                                    {Array.from({ length: columns }).map((_, colIndex) => {
                                        const index = virtualRow.index * columns + colIndex;
                                        const file = files[index];
                                        if (!file) return <Box key={colIndex} sx={{ width: itemWidth }} />;
                                        
                                        return (
                                            <Box 
                                                key={file.id} 
                                                onDoubleClick={() => handleItemDoubleClick(file)}
                                                sx={{
                                                    position: 'relative', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px',
                                                    p: 2, pt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1,
                                                    cursor: 'pointer', transition: 'all 0.2s', width: itemWidth, minHeight: itemHeight,
                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(139, 92, 246, 0.5)', '& .action-menu': { opacity: 1 } }
                                                }}
                                            >
                                                <Box sx={{ flexShrink: 0 }}>{getFileVisual(file)}</Box>
                                                <Box sx={{ width: '100%', overflow: 'hidden' }}>
                                                    <Typography sx={{ color: 'white', fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.85rem', lineHeight: 1.3, mb: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {file.name}
                                                    </Typography>
                                                    {!file.isDir && file.size > 0 && <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>{formatSize(file.size)}</Typography>}
                                                    {file.isDir && file.size > 0 && currentPath === '/' && <Typography sx={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>{formatSize(file.size)}</Typography>}
                                                </Box>
                                                <IconButton className="action-menu" size="small" onClick={(e) => handleMenuClick(e, file)} sx={{ position: 'absolute', top: 4, right: 4, color: '#64748b', opacity: 0, transition: 'opacity 0.2s', '&:hover': { color: 'white' } }}>
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {!loading && files.length > 0 && viewMode === 'list' && (
                    <TableContainer component={Paper} sx={{ bgcolor: 'rgba(15, 23, 42, 0.4)', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Table size="small" sx={{ tableLayout: 'fixed' }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Nombre</TableCell>
                                    <TableCell align="right" sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', width: 120 }}>Tamaño</TableCell>
                                    <TableCell align="right" sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', width: 120 }}>Modificado</TableCell>
                                    <TableCell align="right" sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', width: 60 }}></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody sx={{ display: 'block', position: 'relative', height: `${listVirtualizer.getTotalSize()}px` }}>
                                {listVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const file = files[virtualRow.index];
                                    return (
                                        <TableRow 
                                            key={file.id} 
                                            onDoubleClick={() => handleItemDoubleClick(file)} 
                                            sx={{ 
                                                display: 'flex', position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)`,
                                                cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }, '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)' }
                                            }}
                                        >
                                            <TableCell sx={{ color: 'white', flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                {getFileVisual(file)} {file.name}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: file.isDir && file.size > 0 ? '#10b981' : '#94a3b8', width: 120, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                {file.size > 0 && (!file.isDir || currentPath === '/') ? formatSize(file.size) : '--'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ color: '#94a3b8', width: 120, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                {file.modDate ? new Date(file.modDate).toLocaleDateString() : '--'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                <IconButton size="small" onClick={(e) => handleMenuClick(e, file)} sx={{ color: '#64748b', '&:hover': { color: 'white' } }}>
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}>
                <MenuItem onClick={() => openDialog('rename')}><ListItemIcon><RenameIcon fontSize="small" sx={{ color: '#94a3b8' }} /></ListItemIcon><ListItemText>Renombrar</ListItemText></MenuItem>
                <MenuItem onClick={() => openDialog('move')}><ListItemIcon><MoveIcon fontSize="small" sx={{ color: '#94a3b8' }} /></ListItemIcon><ListItemText>Mover a...</ListItemText></MenuItem>
                {selectedFile?.isDir && (
                    <MenuItem onClick={handlePurge} sx={{ color: '#f59e0b' }}><ListItemIcon><PurgeIcon fontSize="small" sx={{ color: '#f59e0b' }} /></ListItemIcon><ListItemText>Purgar carpeta</ListItemText></MenuItem>
                )}
                <MenuItem onClick={handleDelete} sx={{ color: '#ef4444' }}><ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon><ListItemText>Eliminar</ListItemText></MenuItem>
            </Menu>

            <Dialog open={Boolean(dialogMode)} onClose={closeDialog} PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minWidth: 400 } }}>
                <DialogTitle>{dialogMode === 'createFolder' && 'Nueva Carpeta'}{dialogMode === 'rename' && 'Renombrar'}{dialogMode === 'move' && 'Mover Archivo'}</DialogTitle>
                <DialogContent>
                    {(dialogMode === 'createFolder' || dialogMode === 'rename') && (
                        <TextField autoFocus margin="dense" label="Nombre" fullWidth value={dialogInput} onChange={(e) => setDialogInput(e.target.value)} sx={{ mt: 2, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} />
                    )}
                    {dialogMode === 'move' && (
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel sx={{ color: '#94a3b8' }}>Carpeta destino</InputLabel>
                            <Select value={moveDestination} onChange={(e) => setMoveDestination(e.target.value)} label="Carpeta destino" sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                                {foldersList.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
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
