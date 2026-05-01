'use client';

import { Box, LinearProgress } from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import ModalAsset from '../ModalAsset';
import ModalResultadosDrop from '../ModalResultadosDrop';

export default function AssetsListTab({
    loading,
    table,
    // unified modal
    assetModalOpen,
    onCloseAssetModal,
    detail,
    selected,
    imgUrl,
    formatMBfromB,
    loadingDetail,
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
    // navigation
    onPrevAsset,
    onNextAsset,
    assetModalIndex,
    totalAssets,
    onNavigateWithDirtyCheck,
    // drop results
    dropResultsOpen,
    setDropResultsOpen,
    dropFound,
    dropNotFound,
}) {
    return (
        <>
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <MaterialReactTable table={table} />
            </Box>

            <ModalAsset
                open={assetModalOpen}
                onClose={onCloseAssetModal}
                detail={detail}
                selected={selected}
                imgUrl={imgUrl}
                formatMBfromB={formatMBfromB}
                loadingDetail={loadingDetail}
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
                // navigation
                onPrevAsset={onPrevAsset}
                onNextAsset={onNextAsset}
                assetIndex={assetModalIndex}
                totalAssets={totalAssets}
                onNavigateWithDirtyCheck={onNavigateWithDirtyCheck}
            />

            <ModalResultadosDrop
                open={dropResultsOpen}
                onClose={() => setDropResultsOpen(false)}
                found={dropFound}
                notFound={dropNotFound}
            />
        </>
    );
}
