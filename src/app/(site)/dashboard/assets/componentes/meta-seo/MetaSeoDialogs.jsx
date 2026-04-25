'use client';

import { Box, Dialog } from '@mui/material';
import ModalSyncVectors from '../ModalSyncVectors';
import ModalSyncMultimodalVectors from '../ModalSyncMultimodalVectors';
import ProfilesModal from '../../../upload-batch/ProfilesModal';

export default function MetaSeoDialogs({
    syncVectorsOpen,
    setSyncVectorsOpen,
    syncMultimodalVectorsOpen,
    setSyncMultimodalVectorsOpen,
    metaProfilesOpen,
    setMetaProfilesOpen,
    setMetaProfileAssetId,
    selectedMetaRowForProfiles,
    applyMetaProfile,
    metaImagePreview,
    setMetaImagePreview,
}) {
    return (
        <>
            <ModalSyncVectors
                open={syncVectorsOpen}
                onClose={() => setSyncVectorsOpen(false)}
            />

            <ModalSyncMultimodalVectors
                open={syncMultimodalVectorsOpen}
                onClose={() => setSyncMultimodalVectorsOpen(false)}
            />

            <ProfilesModal
                open={metaProfilesOpen}
                onClose={() => {
                    setMetaProfilesOpen(false);
                    setMetaProfileAssetId(null);
                }}
                selectedRow={selectedMetaRowForProfiles}
                onApply={applyMetaProfile}
            />

            <Dialog
                open={!!metaImagePreview}
                onClose={() => setMetaImagePreview(null)}
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        background: 'transparent',
                        boxShadow: 'none',
                    },
                }}
            >
                {metaImagePreview && (
                    <Box
                        onClick={() => setMetaImagePreview(null)}
                        sx={{
                            cursor: 'zoom-out',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        <img
                            src={metaImagePreview}
                            alt="Preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                            }}
                        />
                    </Box>
                )}
            </Dialog>
        </>
    );
}
