import React from 'react';
import { Counselor, CouncilResponse, TensionPair } from '../types';
import { RollSeat } from '../utils/councilRoll';
import { CouncilSeat } from '../utils/councilSeats';
import { chamberLayout } from '../utils/chamberLayout';
import { tensionArc } from '../utils/tensionArc';
import { arcLabel, arcLabelWidth } from '../utils/arcLabel';
import { groupColor } from '../utils/groupColor';
import { tensionPair } from '../utils/counselorMapper';
import { useElementWidth } from '../hooks/useElementWidth';

export type SittingStatus = 'summoning' | 'refining' | 'sitting';

interface ChamberFloorProps {
  seats: (RollSeat | CouncilSeat)[]; // The roll while summoning, the seated council after
  filled: number; // Seats shown as taken; the rest are drawn empty
  status: SittingStatus;
  tensions: CouncilResponse['tensions'];
  showTensions: boolean;
  selectedId: string | null;
  summary: string;
  amendment: string; // Label for the latest refinement, if any
  secondsLeft: number;
  onSeatClick: (counselor: Counselor) => void;
  onTensionClick: (pair: TensionPair) => void;
  onOpenRecord: () => void;
}

const isMbtiCode = (type: string) => /^[EI][NS][FT][JP]$/.test(type);
const shortName = (name: string) => name.replace(/^The /, '');

// Enter or Space activates an SVG group that acts as a button, as they would a real one.
const onActivateKey = (activate: () => void) => (e: React.KeyboardEvent) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault(); // Space would otherwise scroll the page
  activate();
};

const ChamberFloor: React.FC<ChamberFloorProps> = ({
  seats,
  filled,
  status,
  tensions,
  showTensions,
  selectedId,
  summary,
  amendment,
  secondsLeft,
  onSeatClick,
  onTensionClick,
  onOpenRecord,
}) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const layout = width > 0 ? chamberLayout(seats.length, width) : null;
  const seated = status === 'sitting';
  const seatIndex = (id: string) => seats.findIndex(s => 'counselor' in s && s.counselor.id === id);

  const wait = secondsLeft > 0 ? `About ${secondsLeft} seconds left` : 'Any moment now';
  const well =
    status === 'summoning'
      ? { label: 'The council is being seated', text: wait }
      : status === 'refining'
        ? { label: 'The council is in discussion', text: wait }
        : { label: amendment ? `The matter · ${amendment}` : 'The matter', text: summary };

  return (
    <div ref={ref} className="relative w-full">
      {layout && (
        <>
          <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} className="block" role="group" aria-label="The chamber floor">
            {[layout.radius, layout.radius - 2.2 * layout.seatRadius].map(r => (
              <path
                key={r}
                className="fill-none stroke-rule"
                d={`M ${layout.center.x - r} ${layout.center.y} A ${r} ${r} 0 0 1 ${layout.center.x + r} ${layout.center.y}`}
              />
            ))}

            {seated && showTensions && tensions.map(t => {
              const from = seatIndex(t.counselor_ids[0]);
              const to = seatIndex(t.counselor_ids[1]);
              if (from === -1 || to === -1) return null;
              const label = layout.labelled ? arcLabel(t.core_issue) : '';
              const arc = tensionArc(layout, from, to, label ? arcLabelWidth(label) : 0);
              const pair = tensionPair(t);
              const synthesis = t.type === 'synthesis';
              return (
                <g
                  key={t.pair_id}
                  className="cursor-pointer group"
                  role="button"
                  tabIndex={0}
                  aria-label={`${t.counselor_ids[0]} and ${t.counselor_ids[1]}: ${t.core_issue}`}
                  onClick={() => onTensionClick(pair)}
                  onKeyDown={onActivateKey(() => onTensionClick(pair))}
                >
                  <path d={arc.d} className="fill-none stroke-transparent" strokeWidth={18} />
                  <path d={arc.d} className={`tension-arc ${synthesis ? 'tension-synthesis' : 'tension-conflict'}`} />
                  {arc.labelBox && (
                    <text
                      x={arc.labelBox.x + arc.labelBox.width / 2}
                      y={arc.labelBox.y + arc.labelBox.height - 5}
                      textAnchor="middle"
                      className={`arc-label ${synthesis ? 'fill-brass' : 'fill-seal'}`}
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}

            <g>
              {seats.map((seat, i) => {
                const spot = layout.seats[i];
                const taken = i < filled;
                const counselor = 'counselor' in seat ? seat.counselor : null;
                const clickable = seated && counselor;
                const selected = counselor !== null && counselor.id === selectedId;
                const code = taken && isMbtiCode(seat.type) ? seat.type : seat.numeral;
                return (
                  <g
                    key={seat.numeral}
                    data-counselor-seat
                    className={`seat ${status === 'summoning' ? 'seat-enter' : ''} ${clickable ? 'cursor-pointer' : ''}`}
                    style={{ animationDelay: `${i * 120}ms`, opacity: taken && status !== 'refining' ? 1 : 0.35 }}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable ? `Seat ${seat.numeral}, ${seat.name}` : undefined}
                    onClick={clickable ? () => onSeatClick(counselor) : undefined}
                    onKeyDown={clickable ? onActivateKey(() => onSeatClick(counselor)) : undefined}
                  >
                    <circle
                      cx={spot.x}
                      cy={spot.y}
                      r={layout.seatRadius}
                      className="fill-paper2"
                      style={{ stroke: taken ? groupColor(seat.type) : 'var(--rule)', strokeWidth: selected ? 3 : 1.6 }}
                    />
                    <text x={spot.x} y={spot.y + 4} textAnchor="middle" className="seat-code fill-ink">
                      {code}
                    </text>
                    {spot.label && (
                      <>
                        <text x={spot.x} y={spot.label.y + 19} textAnchor="middle" className="seat-name fill-ink">
                          {taken ? shortName(seat.name) : `Seat ${seat.numeral}`}
                        </text>
                        {taken && (
                          <text x={spot.x} y={spot.label.y + 34} textAnchor="middle" className="seat-role fill-ink2">
                            {seat.role ? `${seat.numeral} · ${seat.role.toUpperCase()}` : seat.numeral}
                          </text>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          <button
            type="button"
            onClick={onOpenRecord}
            disabled={!seated}
            className="absolute text-center px-[18px] py-3 bg-paper border-y border-ink overflow-hidden disabled:cursor-default enabled:hover:bg-paper2"
            style={{ left: layout.well.x, top: layout.well.y, width: layout.well.width, height: layout.well.height }}
          >
            <span className="label block mb-1 truncate">{well.label}</span>
            <span className={`block font-display italic leading-snug line-clamp-3 ${layout.labelled ? 'text-[18px]' : 'text-[16px]'}`}>
              {well.text}
            </span>
          </button>
        </>
      )}
    </div>
  );
};

export default ChamberFloor;
