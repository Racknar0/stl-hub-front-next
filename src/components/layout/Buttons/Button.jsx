'use client';

import React from 'react';
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
    ...props
}) => {
    const classes = ['app-btn', variant ? `app-btn--${variant}` : '', className]
        .filter(Boolean)
        .join(' ');

    const styles_ = {
        width: width ? width : 'auto',
        ...styles,
    };

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
