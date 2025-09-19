import React from 'react';
import {
    Card,
    CardHeader,
    CardContent,
    Box,
    Stack,
    Typography,
    IconButton,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';

export default function ImagesSection({
    imageFiles,
    previewIndex,
    onPrev,
    onNext,
    onDrop,
    onDragOver,
    onOpenFilePicker,
    fileInputRef,
    onSelectFiles,
    onRemove,
    onSelectPreview,
    disabled = false,
}) {
    return (
        <Card className="glass" sx={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
            <CardHeader title="Imágenes" />
            <CardContent>
                {/* Slider de vista previa */}
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 1600,
                        mx: 'auto',
                        height: 560,
                        bgcolor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        mb: 2,
                    }}
                >
                    {imageFiles.length > 0 && previewIndex >= 0 ? (
                        <img
                            src={imageFiles[previewIndex]?.url}
                            alt={imageFiles[previewIndex]?.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    ) : (
                        <Stack alignItems="center" spacing={1}>
                            <AddPhotoAlternateIcon
                                sx={{ fontSize: 48, opacity: 0.7 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Sin imágenes
                            </Typography>
                        </Stack>
                    )}
                    {imageFiles.length > 1 && (
                        <>
                            <IconButton
                                size="small"
                                onClick={onPrev}
                                sx={{
                                    position: 'absolute',
                                    left: 8,
                                    bgcolor: 'rgba(0,0,0,0.35)',
                                }}
                            >
                                <ChevronLeftIcon />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={onNext}
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    bgcolor: 'rgba(0,0,0,0.35)',
                                }}
                            >
                                <ChevronRightIcon />
                            </IconButton>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 8,
                                    left: 0,
                                    right: 0,
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant="caption">
                                    {previewIndex + 1} / {imageFiles.length}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>

                {/* Dropzone clickeable */}
                <Box
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onClick={onOpenFilePicker}
                    sx={{
                        width: '100%',
                        maxWidth: 1600,
                        mx: 'auto',
                        p: 3,
                        border: '2px dotted rgba(0,0,0,0.6)',
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        mb: 2,
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={onSelectFiles}
                        disabled={disabled}
                    />
                    <Stack alignItems="center" spacing={0.5}>
                        <Typography variant="body2">
                            Arrastra y suelta imágenes aquí
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            o haz clic para seleccionar
                        </Typography>
                    </Stack>
                </Box>

                {/* Miniaturas anexadas */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    {imageFiles.map((img, idx) => (
                        <Box
                            key={img.id}
                            sx={{
                                width: 120,
                                height: 84,
                                position: 'relative',
                                borderRadius: 1,
                                overflow: 'hidden',
                                border:
                                    previewIndex === idx
                                        ? '2px solid #7C4DFF'
                                        : '1px solid rgba(255,255,255,0.18)',
                                cursor: 'pointer',
                            }}
                            onClick={() => onSelectPreview(idx)}
                        >
                            <img
                                src={img.url}
                                alt={img.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(img.id);
                                }}
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    bgcolor: 'rgba(0,0,0,0.5)',
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}
