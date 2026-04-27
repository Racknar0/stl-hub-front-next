import { createTheme } from '@mui/material/styles';

/**
 * Tema oscuro del Dashboard.
 * Reemplaza todos los overrides `.dashboard-content .MuiXxx { ... !important }`
 * que antes vivían en dashboard.scss.
 *
 * Al usar ThemeProvider, MUI aplica estos estilos de forma nativa
 * y los componentes pueden sobreescribir con `sx` sin conflictos.
 */
const dashboardTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: 'rgba(0, 0, 0, 0)',
            paper: 'rgba(15, 23, 42, 0.72)',
        },
        text: {
            primary: '#e2e8f0',
            secondary: '#94a3b8',
        },
        primary: {
            main: '#38bdf8',
        },
        divider: 'rgba(148, 163, 184, 0.2)',
        action: {
            hover: 'rgba(56, 189, 248, 0.1)',
        },
    },
    components: {
        /* ── Paper (Cards, Panels) ── */
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    borderColor: 'rgba(148, 163, 184, 0.25)',
                },
            },
        },

        /* ── Tabs ── */
        MuiTabs: {
            styleOverrides: {
                root: {
                    background: 'rgba(15, 23, 42, 0.85)',
                    borderRadius: 10,
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                },
                indicator: {
                    backgroundColor: '#38bdf8',
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    color: '#94a3b8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.78rem',
                    letterSpacing: '0.04em',
                    '&.Mui-selected': {
                        color: '#bae6fd',
                    },
                },
            },
        },

        /* ── TextField / Input ── */
        MuiInputBase: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(2, 6, 23, 0.5)',
                    color: '#f8fafc',
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                notchedOutline: {
                    borderColor: 'rgba(148, 163, 184, 0.4)',
                },
                root: {
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(56, 189, 248, 0.6)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(56, 189, 248, 0.9)',
                    },
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    color: '#94a3b8',
                    '&.Mui-focused': {
                        color: '#38bdf8',
                    },
                },
            },
        },

        /* ── Button ── */
        MuiButton: {
            styleOverrides: {
                outlined: {
                    borderColor: 'rgba(148, 163, 184, 0.45)',
                    color: '#cbd5e1',
                    '&:hover': {
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        borderColor: 'rgba(56, 189, 248, 0.6)',
                    },
                },
            },
        },

        /* ── Switch / Checkbox ── */
        MuiSwitch: {
            styleOverrides: {
                track: {
                    backgroundColor: 'rgba(148, 163, 184, 0.4)',
                },
            },
        },
        MuiCheckbox: {
            styleOverrides: {
                root: {
                    color: '#94a3b8',
                },
            },
        },

        /* ── Slider ── */
        MuiSlider: {
            styleOverrides: {
                rail: {
                    backgroundColor: 'rgba(148, 163, 184, 0.3)',
                },
            },
        },

        /* ── Chip ── */
        MuiChip: {
            styleOverrides: {
                root: {
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                },
                filled: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    color: '#e2e8f0',
                },
            },
        },

        /* ── Dialog ── */
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#e2e8f0',
                },
            },
        },

        /* ── LinearProgress ── */
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(148, 163, 184, 0.2)',
                },
            },
        },

        /* ── Divider ── */
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                },
            },
        },

        /* ── IconButton ── */
        MuiIconButton: {
            styleOverrides: {
                root: {
                    color: '#94a3b8',
                    '&:hover': {
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    },
                },
            },
        },

        /* ── Table (MRT / material-react-table) ── */
        MuiTableContainer: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    '& .MuiTableCell-root': {
                        backgroundColor: 'rgba(2, 6, 23, 0.7)',
                        color: '#94a3b8',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                    },
                },
            },
        },
        MuiTableBody: {
            styleOverrides: {
                root: {
                    '& .MuiTableRow-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        '&:hover': {
                            backgroundColor: 'rgba(56, 189, 248, 0.06)',
                        },
                    },
                    '& .MuiTableCell-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0)',
                        color: '#e2e8f0',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
                    },
                },
            },
        },
        MuiToolbar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    color: '#e2e8f0',
                },
            },
        },
        MuiTablePagination: {
            styleOverrides: {
                root: {
                    color: '#94a3b8',
                    '& .MuiSelect-select': {
                        color: '#e2e8f0',
                    },
                    '& .MuiSvgIcon-root': {
                        color: '#94a3b8',
                    },
                    '& .MuiIconButton-root': {
                        color: '#94a3b8',
                        '&.Mui-disabled': {
                            color: 'rgba(148, 163, 184, 0.3)',
                        },
                    },
                },
            },
        },

        /* ── Menu ── */
        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    color: '#e2e8f0',
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    color: '#e2e8f0',
                    '&:hover': {
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    },
                },
            },
        },

        /* ── Collapse ── */
        MuiCollapse: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(2, 6, 23, 0.4)',
                },
            },
        },

        /* ── Tooltip ── */
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: 'rgba(2, 6, 23, 0.92)',
                    color: '#f8fafc',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                },
            },
        },

        /* ── Autocomplete / Popover ── */
        MuiAutocomplete: {
            styleOverrides: {
                paper: {
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                },
                option: {
                    color: '#e2e8f0',
                    '&:hover': {
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    },
                    '&[aria-selected="true"]': {
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    },
                },
            },
        },
        MuiPopover: {
            styleOverrides: {
                paper: {
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                },
            },
        },

        /* ── SVG Icons ── */
        MuiSvgIcon: {
            styleOverrides: {
                root: {
                    color: 'inherit',
                },
            },
        },
    },
});

export default dashboardTheme;
