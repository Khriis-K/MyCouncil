import React from 'react';
import { Counselor, CouncilResponse, TensionPair } from '../types';
import { CouncilSeat } from '../utils/councilSeats';
import { tensionPair } from '../utils/counselorMapper';

interface OrderOfBusinessProps {
  seats: CouncilSeat[];
  tensions: CouncilResponse['tensions'];
  selectedId: string | null;
  disabled: boolean;
  onSeatClick: (counselor: Counselor) => void;
  onTensionClick: (pair: TensionPair) => void;
}

// Beside the floor: each counselor's first impression in seat order, then the disagreements between them.
const OrderOfBusiness: React.FC<OrderOfBusinessProps> = ({ seats, tensions, selectedId, disabled, onSeatClick, onTensionClick }) => {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="label">Order of business</h2>
      <ol>
        {seats.map(seat => (
          <li key={seat.numeral} className="border-b border-rule">
            <button
              type="button"
              data-counselor-seat
              disabled={disabled}
              onClick={() => onSeatClick(seat.counselor)}
              className={`grid grid-cols-[26px_1fr] w-full text-left py-[9px] -mx-2.5 px-2.5 box-content enabled:hover:bg-paper2 ${
                seat.counselor.id === selectedId ? 'bg-paper2' : ''
              }`}
            >
              <span className="label pt-1">{seat.numeral}</span>
              <span>
                <b className="block font-display text-[18px] font-semibold leading-tight">{seat.name}</b>
                <span className="block text-[13px] italic leading-snug text-ink2 mt-0.5">{seat.impression}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {tensions.length > 0 && (
        <div className="flex flex-col gap-2 mt-1.5">
          <h3 className="label">Disagreements</h3>
          {tensions.map(t => {
            const synthesis = t.type === 'synthesis';
            const [a, b] = t.counselor_ids;
            return (
              <button
                key={t.pair_id}
                type="button"
                disabled={disabled}
                onClick={() => onTensionClick(tensionPair(t))}
                className="grid grid-cols-[22px_1fr] gap-x-2.5 items-baseline text-left text-[14px] enabled:hover:text-seal"
              >
                <i
                  aria-hidden
                  className={`block w-[22px] border-t-2 -translate-y-1 ${synthesis ? 'border-dashed border-brass' : 'border-seal'}`}
                />
                <span>{synthesis ? `${a} & ${b}` : `${a} v. ${b}`}</span>
                <span className="col-start-2 text-[12.5px] italic leading-snug text-ink2">{t.core_issue}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderOfBusiness;
