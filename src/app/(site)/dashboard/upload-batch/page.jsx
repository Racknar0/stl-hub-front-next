// Nueva vista para Upload Batch
'use client'
import React from 'react'
import BatchTable from './BatchTable'

export default function UploadBatchPage() {
  return (
    <div style={{padding: '2rem'}}>
      <h1>Upload Batch</h1>
      <BatchTable />
    </div>
  )
}
