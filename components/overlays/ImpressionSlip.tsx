import React from 'react';
import { CouncilSeat } from '../../utils/councilSeats';
import { seatHeading } from '../../utils/seatHeading';

interface ImpressionSlipProps {
  seat: CouncilSeat;
  onViewFull: () => void;
  onClose: () => void;
  isExiting?: boolean; // Plays the slip out while the next one comes in
}

// A counselor's first impression, laid on the chamber floor when their seat is clicked.
const ImpressionSlip: React.FC<ImpressionSlipProps> = ({ seat, onViewFull, onClose, isExiting = false }) => {
  return (
    <div
      data-impression-slip
      role="dialog"
      aria-label={`${seat.name}'s first impression`}
      className={`fixed z-40 bottom-24 left-4 right-4 md:left-auto md:right-9 md:w-[400px] bg-paper2 border border-ink px-6 pt-5 pb-[22px] ${
        isExiting ? 'slip-out pointer-events-none' : 'slip-in'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center gap-4">
        <span className="label">{seatHeading(seat)}</span>
        <button type="button" onClick={onClose} className="caps text-ink2 hover:text-ink">
          Close
        </button>
      </div>
      <q className="block font-display italic text-[24px] leading-[1.25] mt-2.5 mb-4">
        {seat.impression || 'Click to view full assessment'}
      </q>
      <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
        <b className="font-display text-[20px] font-semibold whitespace-nowrap">{seat.name}</b>
        <button type="button" onClick={onViewFull} className="btn-seal whitespace-nowrap">
          Read full opinion
        </button>
      </div>
    </div>
  );
};

export default ImpressionSlip;
