import React from 'react';
import {
    Card,
    CardHeader,
    CardContent,
    Stack,
    Button,
    Box,
    Typography,
} from '@mui/material';

export default function AssetFileSection({ setTitle, onFileSelected, disabled = false }) {
    const [selectedFile, setSelectedFile] = React.useState(null);
    const fileInputRef = React.useRef(null);

    const openPicker = () => !disabled && fileInputRef.current?.click();

    const getNameWithoutExt = (name = '') => name.replace(/\.[^/.]+$/, '');
    const formatBytes = (bytes = 0) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    };

    const handlePick = (file) => {
        if (!file) return;
        setSelectedFile(file);
        if (onFileSelected) onFileSelected(file);
        if (setTitle) setTitle(getNameWithoutExt(file.name));
    };

    const onInputChange = (e) => handlePick(e.target.files?.[0]);

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        const file = e.dataTransfer?.files?.[0];
        handlePick(file);
    };
    const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

    const shownName = selectedFile?.name || '—';
    const shownSize = selectedFile ? formatBytes(selectedFile.size) : '';

    return (
        <Card className="glass mb-4" >
            <CardHeader title="Archivo del stl" />
            <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                    <Button variant="outlined" onClick={openPicker} disabled={disabled}>Seleccionar archivo</Button>
                    <Box sx={{ flex: 1 }} />
                </Stack>

                {/* Dropzone para arrastrar y soltar */}
                <Box
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onClick={openPicker}
                    sx={{
                        width: '100%',
                        p: 3,
                        border: '2px dotted rgba(0,0,0,0.6)',
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.6 : 1,
                        mb: 2,
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        // Tipos permitidos: ajusta si deseas otras extensiones
                        accept=".zip,.rar,.7z"
                        style={{ display: 'none' }}
                        onChange={onInputChange}
                        disabled={disabled}
                    />
                    <Stack alignItems="center" spacing={0.5}>
                        <Typography variant="body2">Arrastra y suelta el archivo aquí</Typography>
                        <Typography variant="caption" color="text.secondary">o haz clic para seleccionar</Typography>
                    </Stack>
                </Box>

                <Typography variant="body2" gutterBottom>
                    Seleccionado: <strong>{shownName}</strong>{shownSize ? ` · ${shownSize}` : ''}
                </Typography>
            </CardContent>
        </Card>
    );
}
