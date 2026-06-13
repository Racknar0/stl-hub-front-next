// Nueva vista para Upload Batch con panel de notificaciones al final
'use client'
import React, { useState, useEffect, useCallback } from 'react'
import BatchTable from './BatchTable'
import { Box, Card, CardHeader, CardContent, IconButton, LinearProgress, Stack, Tooltip, Typography, Button, Chip, Divider } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import DeleteIcon from '@mui/icons-material/Delete'
import HttpService from '@/services/HttpService'
import { successAlert, errorAlert } from '@/helpers/alerts'

const http = new HttpService()

function BatchUploaderNotifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await http.getData('/admin/notifications?type=BATCH_UPLOADER&take=100')
      const list = res.data?.notifications || res.data?.items || []
      setItems(list)
    } catch (e) {
      console.error('Failed to load batch uploader notifications', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const deleteOne = async (id) => {
    try {
      await http.deleteData('/admin/notifications', id)
      await fetchNotifications()
    } catch (e) {
      await errorAlert('Error', 'No se pudo eliminar la alerta')
    }
  }

  const clearAll = async () => {
    try {
      setClearing(true)
      await http.postData('/admin/notifications/clear-by-type', { type: 'BATCH_UPLOADER' })
      await successAlert('Hecho', 'Todas las alertas de subida han sido eliminadas')
      await fetchNotifications()
    } catch (e) {
      await errorAlert('Error', 'No se pudieron eliminar las alertas')
    } finally {
      setClearing(false)
    }
  }

  return (
    <Card className="glass" sx={{ border: '1px solid rgba(211, 47, 47, 0.2)' }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
              Historial de Alertas del Cargador de Lotes
            </Typography>
            <Chip label={items.length} color="error" size="small" />
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refrescar">
              <span>
                <IconButton onClick={fetchNotifications} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={clearAll}
              disabled={clearing || items.length === 0}
            >
              Limpiar Todo
            </Button>
          </Stack>
        }
      />
      <Divider />
      <CardContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {!loading && items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No hay alertas de subida pendientes. Todo está al día.
          </Typography>
        )}
        <Stack spacing={1.5} sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {items.map((n) => {
            const formattedDate = new Date(n.createdAt).toLocaleString('es-ES', {
              dateStyle: 'short',
              timeStyle: 'medium',
            })
            return (
              <Box
                key={n.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(211, 47, 47, 0.04)',
                  borderLeft: '4px solid #d32f2f',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#222' }}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formattedDate}
                    </Typography>
                  </Stack>
                  {n.body && (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#444' }}>
                      {n.body}
                    </Typography>
                  )}
                </Box>
                <Tooltip title="Eliminar alerta">
                  <span>
                    <IconButton size="small" color="error" onClick={() => deleteOne(n.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function UploadBatchPage() {
  return (
    <div style={{padding: '2rem'}}>
      <BatchTable />
      <Box sx={{ my: 4 }} />
      <BatchUploaderNotifications />
    </div>
  )
}
