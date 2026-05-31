'use client';

import React from 'react';
import Link from 'next/link';
import useStore from '../../../store/useStore';
import './Button.scss';

/*
  Uso:
  <Button variant="cyan" width="lg" icon={<Icon/>}>Cuenta</Button>
  Variants: 'cyan' | 'purple' | 'dangerOutline'
  width: '100px' | '140px' 
*/
const Button = ({
    children,
    className = '',
    variant,
    width,
    icon,
    as: Tag = 'button',
    styles,
    href,
    onClick,
    ...props
}) => {
    const setGlobalLoading = useStore((s) => s.setGlobalLoading);

    const classes = ['app-btn', variant ? `app-btn--${variant}` : '', className]
        .filter(Boolean)
        .join(' ');

    const styles_ = {
        width: width ? width : 'auto',
        ...styles,
    };

    const handleInternalLinkClick = (e) => {
        if (typeof onClick === 'function') onClick(e);
        if (e?.defaultPrevented) return;
        if (e?.button !== undefined && e.button !== 0) return;
        if (e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey) return;
        if (!href || href.startsWith('#')) return;

        try {
            const target = new URL(href, window.location.origin);
            const current = `${window.location.pathname}${window.location.search}`;
            const next = `${target.pathname}${target.search}`;
            if (current === next) return;
        } catch {
            return;
        }

        setGlobalLoading(true);
    };

    // Navegación interna con Next Link para evitar full reload
    if (href) {
        const isInternal = /^\/(?!\/)/.test(href) || href.startsWith('#');
        if (isInternal) {
            return (
                <Link href={href} className={classes} style={styles_} onClick={handleInternalLinkClick} {...props}>
                    {icon && (
                        <span className="app-btn__icon" aria-hidden>
                            {icon}
                        </span>
                    )}
                    {children}
                </Link>
            );
        }
        // Enlaces externos conservan <a>
        return (
            <a href={href} className={classes} {...props} style={styles_}>
                {icon && (
                    <span className="app-btn__icon" aria-hidden>
                        {icon}
                    </span>
                )}
                {children}
            </a>
        );
    }

    // Sin href: renderiza el Tag proporcionado (button por defecto)
    return (
        <Tag className={classes} {...props} onClick={onClick} style={styles_}>
            {icon && (
                <span className="app-btn__icon" aria-hidden>
                    {icon}
                </span>
            )}
            {children}
        </Tag>
    );
};

export default Button;
