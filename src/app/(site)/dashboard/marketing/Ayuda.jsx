'use client'

import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import HelpOutline from '@mui/icons-material/HelpOutline'

// Ícono "?" con la explicación en un tooltip. Sustituye a los textos de ayuda sueltos.
export default function Ayuda({ texto }) {
  return (
    <Tooltip title={texto} arrow placement="top" enterTouchDelay={0}>
      <span className="mk-help" tabIndex={0} aria-label="Ayuda">
        <HelpOutline fontSize="inherit" />
      </span>
    </Tooltip>
  )
}
