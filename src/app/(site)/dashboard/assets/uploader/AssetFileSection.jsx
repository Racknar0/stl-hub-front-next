import React from 'react';
import {
    Card,
    CardHeader,
    CardContent,
    Box,
    Typography,
    Button,
} from '@mui/material';

export default function AssetFileSection({ setTitle, setTitleEn, onFileSelected, disabled = false, queueSummaryText = '', isDraggingGlobal = false, archiveFile = null }) {
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
        const files = Array.from(e.dataTransfer?.files || []);
        if (!files.length) return;

        const archiveCandidates = files.filter((f) => {
            const m = String(f?.name || '').toLowerCase().match(/\.([0-9a-z]+)$/);
            const ext = m ? m[1] : '';
            return ['zip', 'rar', '7z'].includes(ext);
        });

        const file = archiveCandidates.reduce((best, curr) => {
            if (!best) return curr;
            const a = Number(best?.size || 0);
            const b = Number(curr?.size || 0);
            return b > a ? curr : best;
        }, null) || files[0];

        handlePick(file);
    };
    const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

    // Sincronizar selección local cuando el padre actualiza `archiveFile`
    React.useEffect(() => {
        try {
            if (archiveFile) {
                if (!selectedFile || selectedFile?.name !== archiveFile?.name) {
                    setSelectedFile(archiveFile)
                }
            } else {
                if (selectedFile) setSelectedFile(null)
            }
        } catch {}
    }, [archiveFile]);

    const shownName = selectedFile?.name || '—';
    const shownSize = selectedFile ? formatBytes(selectedFile.size) : '';

    return (
        <Card className="glass mb-3" >
            <CardHeader
                title="Archivo"
                action={
                    queueSummaryText ? (
                        <Typography
                            variant="h6"
                            sx={{
                                opacity: 0.85,
                                mt: 0.75,
                                whiteSpace: 'nowrap',
                                fontWeight: 800,
                                color: 'text.secondary',
                            }}
                        >
                            {queueSummaryText}
                        </Typography>
                    ) : null
                }
            />
            <CardContent>
                <Box
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    sx={{
                        width: '100%',
                        p: 1.5,
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        flexWrap: 'wrap',
                        opacity: disabled ? 0.6 : 1,
                        mb: 2,
                        backgroundColor: isDraggingGlobal ? 'rgba(124,77,255,0.03)' : undefined,
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
                    <Typography variant="caption" color="text.secondary">
                        Archivo principal del asset
                    </Typography>
                    <Button variant="outlined" size="small" onClick={openPicker} disabled={disabled}>
                        Elegir archivo
                    </Button>
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
