'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

const StickyNote = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 300, height: 300 });
    const [content, setContent] = useState('');
    const [isClient, setIsClient] = useState(false);
    
    const dragRef = useRef(null);
    const containerRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // Función para mantener la posición dentro de la pantalla
    const clampPosition = (pos, currentWidth, currentHeight) => {
        if (typeof window === 'undefined') return pos;
        const maxX = 20;
        const minX = - (window.innerWidth - currentWidth - 20);
        const maxY = 20;
        const minY = - (window.innerHeight - currentHeight - 20);

        return {
            x: Math.min(Math.max(pos.x, minX), maxX),
            y: Math.min(Math.max(pos.y, minY), maxY)
        };
    };

    useEffect(() => {
        setIsClient(true);
        const savedState = localStorage.getItem('stickyNoteState');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.size) setSize(parsed.size);
                if (parsed.isOpen !== undefined) setIsOpen(parsed.isOpen);
                
                // Rescatar si se salió de la pantalla en la sesión anterior
                if (parsed.position) {
                    // Usar tamaño de la burbuja (56) si está cerrado, o el tamaño guardado si está abierto
                    const w = parsed.isOpen === false ? 56 : (parsed.size?.width || 300);
                    const h = parsed.isOpen === false ? 56 : (parsed.size?.height || 300);
                    
                    const safePos = clampPosition(parsed.position, w, h);
                    setPosition(safePos);
                    
                    // Si la posición guardada era insegura (se perdió), corregir el storage inmediatamente
                    if (safePos.x !== parsed.position.x || safePos.y !== parsed.position.y) {
                        const stateToSave = { ...parsed, position: safePos };
                        localStorage.setItem('stickyNoteState', JSON.stringify(stateToSave));
                    }
                }
            } catch (e) {
                console.error("Error parsing stickyNoteState");
            }
        }
        
        const fetchNote = async () => {
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
                const { data } = await axios.get(apiBase + '/api/admin/notes', {
                    withCredentials: true
                });
                if (data && data.content) {
                    setContent(data.content);
                }
            } catch (error) {
                console.error("Error loading sticky note", error);
            }
        };
        fetchNote();
    }, []);

    const saveStateToLocal = useCallback((newState) => {
        const stateToSave = {
            position: newState.position || position,
            size: newState.size || size,
            isOpen: newState.isOpen !== undefined ? newState.isOpen : isOpen
        };
        localStorage.setItem('stickyNoteState', JSON.stringify(stateToSave));
    }, [position, size, isOpen]);

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
                await axios.put(apiBase + '/api/admin/notes', { content: newContent }, {
                    withCredentials: true
                });
            } catch (error) {
                console.error("Error saving sticky note", error);
            }
        }, 1000);
    };

    const handleMouseDown = (e) => {
        if (e.target.tagName.toLowerCase() === 'textarea') return;
        e.preventDefault();
        
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;
        let hasDragged = false;

        const handleMouseMove = (moveEvent) => {
            hasDragged = true;
            let newX = moveEvent.clientX - startX;
            let newY = moveEvent.clientY - startY;

            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const safePos = clampPosition({ x: newX, y: newY }, rect.width, rect.height);
                newX = safePos.x;
                newY = safePos.y;
            }

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = (upEvent) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (hasDragged) {
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const finalPos = clampPosition({ 
                        x: upEvent.clientX - startX, 
                        y: upEvent.clientY - startY 
                    }, rect.width, rect.height);
                    saveStateToLocal({ position: finalPos });
                }
            } else {
                if (!isOpen) {
                    toggleOpen();
                }
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeStop = () => {
        if (!isOpen) return;
        if (dragRef.current) {
            setSize({
                width: dragRef.current.offsetWidth,
                height: dragRef.current.offsetHeight
            });
            saveStateToLocal({
                size: {
                    width: dragRef.current.offsetWidth,
                    height: dragRef.current.offsetHeight
                }
            });
            
            // Re-clamp position in case resize pushed it off-screen
            if (containerRef.current) {
                const safePos = clampPosition(position, dragRef.current.offsetWidth, dragRef.current.offsetHeight);
                if (safePos.x !== position.x || safePos.y !== position.y) {
                    setPosition(safePos);
                    saveStateToLocal({ position: safePos, size: { width: dragRef.current.offsetWidth, height: dragRef.current.offsetHeight } });
                }
            }
        }
    };

    const toggleOpen = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        
        if (nextState && (size.width < 200 || size.height < 150)) {
            const defaultSize = { width: 300, height: 300 };
            setSize(defaultSize);
            saveStateToLocal({ isOpen: nextState, size: defaultSize });
        } else {
            saveStateToLocal({ isOpen: nextState });
        }
        
        // Ensure the newly opened note (or bubble) is still fully on-screen
        setTimeout(() => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const safePos = clampPosition(position, rect.width, rect.height);
                if (safePos.x !== position.x || safePos.y !== position.y) {
                    setPosition(safePos);
                    saveStateToLocal({ position: safePos });
                }
            }
        }, 50);
    };

    if (!isClient) return null;

    return (
        <Box
            ref={containerRef}
            style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                transform: `translate(${position.x}px, ${position.y}px)`,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                transition: isOpen ? 'none' : 'all 0.2s ease', 
            }}
        >
            {!isOpen ? (
                <Tooltip title="Abrir Notas" placement="left">
                    <Box
                        onMouseDown={handleMouseDown}
                        sx={{
                            backgroundColor: '#fff7a1',
                            color: '#333',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'grab',
                            '&:hover': {
                                backgroundColor: '#fff275',
                            },
                            '&:active': {
                                cursor: 'grabbing'
                            }
                        }}
                    >
                        <EditNoteIcon fontSize="large" />
                    </Box>
                </Tooltip>
            ) : (
                <Box
                    ref={dragRef}
                    onMouseUpCapture={handleResizeStop}
                    sx={{
                        backgroundColor: '#fff7a1',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        width: size.width,
                        height: size.height,
                        minWidth: 200,
                        minHeight: 150,
                        resize: 'both' // Aplicar resize al contenedor principal
                    }}
                >
                    <Box
                        onMouseDown={handleMouseDown}
                        sx={{
                            backgroundColor: '#f5ea7c',
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 12px',
                            cursor: 'grab',
                            userSelect: 'none',
                            '&:active': {
                                cursor: 'grabbing'
                            }
                        }}
                    >
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                            <EditNoteIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
                            Notas Rápidas
                        </span>
                        <IconButton size="small" onClick={toggleOpen} onMouseDown={(e) => e.stopPropagation()} sx={{ padding: '4px', color: '#555' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    
                    <textarea
                        value={content}
                        onChange={handleContentChange}
                        placeholder="Escribe tus pendientes aquí..."
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: 'none',
                            padding: '16px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            color: '#333',
                            resize: 'none', // Quitar resize del textarea para que el padre mande
                            outline: 'none',
                            lineHeight: '1.6',
                            width: '100%',
                            height: '100%'
                        }}
                    />
                </Box>
            )}
        </Box>
    );
};

export default StickyNote;
