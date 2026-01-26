import React from 'react';
import {
    Card,
    CardHeader,
    CardContent,
    Stack,
    Box,
    Typography,
} from '@mui/material';

export default function AssetFileSection({ setTitle, setTitleEn, onFileSelected, disabled = false }) {
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [error, setError] = React.useState('');
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

    // Normaliza el nombre: sin extensión, reemplaza -, _, . por espacio, colapsa espacios y pasa a minúsculas
    const normalizeName = (name = '') =>
        getNameWithoutExt(name)
            .replace(/[-_.]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    const handlePick = (file) => {
        if (!file) return;
        setError('')
        // Validar extensión
        const name = file.name || ''
        const extMatch = name.toLowerCase().match(/\.([0-9a-z]+)$/)
        const ext = extMatch ? extMatch[1] : ''
        const allowed = ['zip', 'rar', '7z']
        if (!allowed.includes(ext)) {
            // Mostrar alerta nativa y no anexar
            try { window.alert('Solo se permiten archivos .zip, .rar o .7z') } catch (e) {}
            // resetear input para permitir reintento
            try { if (fileInputRef.current) fileInputRef.current.value = '' } catch (e) {}
            setSelectedFile(null)
            if (onFileSelected) onFileSelected(null)
            return
        }
        // Solo un archivo: reemplaza el anterior
        setSelectedFile(file);
        if (onFileSelected) onFileSelected(file);
        // Autorrellenar títulos ES/EN con el nombre normalizado del archivo
        const norm = normalizeName(file.name || '');
        try { setTitle && setTitle(norm); } catch {}
        try { setTitleEn && setTitleEn(norm); } catch {}
    };

    const onInputChange = (e) => {
        const f = e.target.files?.[0];
        handlePick(f);
    };

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
        <Card className="glass mb-3" >
            <CardHeader title="Archivo del stl" />
            <CardContent>
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
                {error && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                        {error}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
