'use client';

import { Box, LinearProgress } from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import ModalDetalle from '../ModalDetalle';
import ModalEditar from '../ModalEditar';
import ModalResultadosDrop from '../ModalResultadosDrop';

export default function AssetsListTab({
    loading,
    table,
    previewOpen,
    setPreviewOpen,
    detail,
    selected,
    imgUrl,
    formatMBfromB,
    loadingDetail,
    dropResultsOpen,
    setDropResultsOpen,
    dropFound,
    dropNotFound,
    editOpen,
    setEditOpen,
    resetEdit,
    editForm,
    setEditForm,
    categories,
    allTags,
    editImageFiles,
    setEditImageFiles,
    editPreviewIndex,
    setEditPreviewIndex,
    fileInputRef,
    onSelectFiles,
    onOpenFilePicker,
    onPrev,
    onNext,
    onDrop,
    onDragOver,
    onRemove,
    onSelectPreview,
    handleSaveEdit,
}) {
    return (
        <>
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <MaterialReactTable table={table} />
            </Box>

            <ModalDetalle
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                detail={detail}
                selected={selected}
                imgUrl={imgUrl}
                formatMBfromB={formatMBfromB}
                loadingDetail={loadingDetail}
            />

            <ModalResultadosDrop
                open={dropResultsOpen}
                onClose={() => setDropResultsOpen(false)}
                found={dropFound}
                notFound={dropNotFound}
            />

            <ModalEditar
                open={editOpen}
                onClose={() => {
                    setEditOpen(false);
                    resetEdit();
                }}
                selected={selected}
                editForm={editForm}
                setEditForm={setEditForm}
                categories={categories}
                allTags={allTags}
                editImageFiles={editImageFiles}
                setEditImageFiles={setEditImageFiles}
                editPreviewIndex={editPreviewIndex}
                setEditPreviewIndex={setEditPreviewIndex}
                fileInputRef={fileInputRef}
                onSelectFiles={onSelectFiles}
                onOpenFilePicker={onOpenFilePicker}
                onPrev={onPrev}
                onNext={onNext}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onRemove={onRemove}
                onSelectPreview={onSelectPreview}
                loading={loading}
                onSave={handleSaveEdit}
                imgUrl={imgUrl}
            />
        </>
    );
}
