'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import AccountCard from './AccountCard';

export default function VirtualAccountsGrid({ accounts, resetKey, pendingIds, ...actions }) {
    const gridRef = useRef(null);
    const [metrics, setMetrics] = useState({ columns: 1, offset: 0 });
    const [scrollElement, setScrollElement] = useState(null);
    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;
        let scroller = grid.parentElement;
        while (scroller && scroller !== document.body) {
            if (/(auto|scroll)/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight + 1) break;
            scroller = scroller.parentElement;
        }
        scroller ||= document.body;
        setScrollElement(scroller);
        const measure = () => {
            const columns = Math.max(1, Math.min(7, Math.floor((grid.clientWidth + 8) / 228)));
            const offset = grid.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
            setMetrics(previous => previous.columns === columns && Math.abs(previous.offset - offset) < 1
                ? previous : { columns, offset });
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(grid);
        if (grid.parentElement) observer.observe(grid.parentElement);
        window.addEventListener('resize', measure);
        return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
    }, []);

    const virtualizer = useVirtualizer({
        getScrollElement: () => scrollElement,
        count: Math.ceil(accounts.length / metrics.columns),
        estimateSize: () => 128,
        overscan: 3,
        scrollMargin: metrics.offset,
        getItemKey: index => `${metrics.columns}-${accounts[index * metrics.columns]?.id ?? index}`,
    });

    useLayoutEffect(() => {
        // A different result set starts at its first row without jumping past the toolbar.
        if (scrollElement && scrollElement.scrollTop > metrics.offset) scrollElement.scrollTo({ top: metrics.offset, behavior: 'instant' });
        // Offset changes from expanding controls should not reset browsing position.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    return (
        <div ref={gridRef} aria-label={`${accounts.length} cuentas`} style={{ minWidth: 0 }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
                {virtualizer.getVirtualItems().map(row => (
                    <div key={row.key} data-index={row.index} ref={virtualizer.measureElement}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', paddingBottom: 8,
                            transform: `translateY(${row.start - metrics.offset}px)`, display: 'grid', gap: 8,
                            gridTemplateColumns: `repeat(${metrics.columns}, minmax(0, 1fr))` }}>
                        {accounts.slice(row.index * metrics.columns, (row.index + 1) * metrics.columns).map(account => (
                            <AccountCard key={account.id} acc={account} isPending={pendingIds.has(account.id)} {...actions} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
