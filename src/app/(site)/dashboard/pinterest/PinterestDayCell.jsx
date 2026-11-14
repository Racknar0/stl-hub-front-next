'use client';
import React, { memo, useMemo } from 'react';
import PinterestThumbnail from './PinterestThumbnail';

const THUMBNAILS_PER_DAY = 4;
const PINS_PER_DAY = 15;

function PinterestDayCell({ day, stats, today, past, selected, onSelect, onOpen, resolveImage }) {
  const total = stats?.total || 0;
  const gap = !past && total === 0;
  const scale = Math.max(PINS_PER_DAY, total);
  const thumbnails = useMemo(() => [...(stats?.pins || [])]
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, THUMBNAILS_PER_DAY), [stats?.pins]);
  const extra = Math.max(0, total - thumbnails.length);
  return <div className={`day ${today ? 'today' : ''} ${selected ? 'selected' : ''} ${past ? 'past' : ''} ${gap ? 'gap' : ''}`}
    onClick={() => onSelect(day)} onDoubleClick={() => onOpen('list')}
    title={total ? `${stats.published} publicados · ${stats.pending} programados · ${stats.failed} errores. Abre el día para ver todos.` : 'Sin pines'}>
    <div className="day-top">
      <div className="day-number">{day}</div>
      {total > 0 && <span className={`pr-day-count ${total >= PINS_PER_DAY ? 'full' : ''}`}>{total}/{PINS_PER_DAY}</span>}
    </div>
    {total > 0 ? <>
      <div className="pr-fill-bar">
        <b className="ok" style={{ width: `${(stats.published / scale) * 100}%` }} />
        <b className="pen" style={{ width: `${(stats.pending / scale) * 100}%` }} />
        <b className="err" style={{ width: `${(stats.failed / scale) * 100}%` }} />
      </div>
      <div className="pr-day-thumbs">
        {thumbnails.map(pin => <span key={pin.id} className={`pr-day-thumb st-${pin.status?.toLowerCase()}`}>
          <PinterestThumbnail src={resolveImage(pin.imageUrl)} size={64} />
        </span>)}
        {extra > 0 && <span className="pr-day-more" title={`${extra} pines más; selecciona el día para verlos todos`}>+{extra}</span>}
      </div>
    </> : gap ? <span className="pr-gap-label">Sin pines</span> : null}
  </div>;
}

// Typing/editing a pin should not rebuild the entire month's image grid.
export default memo(PinterestDayCell);
