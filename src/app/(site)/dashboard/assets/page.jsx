'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Chip, Stack, Typography, LinearProgress, Link as MUILink } from '@mui/material'
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table'
import LinkIcon from '@mui/icons-material/Link'
import HttpService from '@/services/HttpService'

const statusColor = (s) => ({
  DRAFT: 'default',
  PROCESSING: 'info',
  PUBLISHED: 'success',
  FAILED: 'error',
}[s] || 'default')

export default function AssetsAdminPage() {
  const http = new HttpService()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)

  const formatMBfromB = (bytes) => {
    const n = Number(bytes)
    if (!n || n <= 0) return '0 MB'
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await http.getData('/assets')
        setAssets(res.data || [])
      } catch (e) {
        console.error('No se pudieron cargar assets', e)
        setAssets([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const columns = useMemo(() => ({
    columns: [
      { header: 'Nombre', accessorKey: 'title' },
      { header: 'Categoría', accessorKey: 'category', size: 140 },
      {
        id: 'tags',
        header: 'Tags',
        accessorFn: (row) => Array.isArray(row.tags) ? row.tags.join(',') : '',
        Cell: ({ row }) => {
          const tags = Array.isArray(row.original.tags) ? row.original.tags : []
          return (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {tags.map((t, i) => <Chip key={`${t}-${i}`} size="small" label={t} variant="outlined" />)}
            </Stack>
          )
        },
      },
      {
        header: 'Plan', accessorKey: 'isPremium', size: 100,
        Cell: ({ cell }) => <Chip size="small" label={cell.getValue() ? 'Premium' : 'Free'} color={cell.getValue() ? 'warning' : 'default'} />,
      },
      {
        header: 'Estado', accessorKey: 'status', size: 120,
        Cell: ({ cell }) => <Chip size="small" label={cell.getValue()} color={statusColor(cell.getValue())} />,
      },
      {
        id: 'sizeB',
        header: 'Tamaño',
        accessorFn: (row) => row.fileSizeB ?? row.archiveSizeB ?? 0,
        Cell: ({ cell }) => <Typography variant="body2">{formatMBfromB(cell.getValue())}</Typography>,
        size: 100,
      },
      { header: 'Cuenta', accessorKey: 'accountId', size: 80 },
      {
        header: 'Creado', accessorKey: 'createdAt', size: 160,
        Cell: ({ cell }) => <Typography variant="body2">{cell.getValue() ? new Date(cell.getValue()).toLocaleString() : '-'}</Typography>,
      },
      {
        header: 'MEGA', accessorKey: 'megaLink', size: 160,
        Cell: ({ cell }) => cell.getValue() ? (
          <Typography variant="body2">
            <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
            <MUILink href={cell.getValue()} target="_blank" rel="noreferrer" underline="hover">Abrir</MUILink>
          </Typography>
        ) : <Typography variant="body2" color="text.secondary">-</Typography>,
      },
    ],
  }), [])

  const table = useMaterialReactTable({
    columns,
    data: assets,
    initialState: { density: 'compact', pagination: { pageSize: 25 } },
    enableStickyHeader: true,
    muiTableContainerProps: { sx: { maxHeight: 620 } },
    state: { showProgressBars: loading },
    enableColumnFilters: false,
    enableGlobalFilter: true,
  })

  return (
    <div className="dashboard-content p-3">
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      <MaterialReactTable table={table} />
    </div>
  )
}
