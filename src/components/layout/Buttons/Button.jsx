'use client';

import React from 'react';
import Link from 'next/link';
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
    ...props
}) => {
    const classes = ['app-btn', variant ? `app-btn--${variant}` : '', className]
        .filter(Boolean)
        .join(' ');

    const styles_ = {
        width: width ? width : 'auto',
        ...styles,
    };

    // Navegación interna con Next Link para evitar full reload
    if (href) {
        const isInternal = /^\/(?!\/)/.test(href) || href.startsWith('#');
        if (isInternal) {
            return (
                <Link href={href} className={classes} style={styles_} {...props}>
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
        <Tag className={classes} {...props} style={styles_}>
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
