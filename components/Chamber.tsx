import React, { useEffect, useState } from 'react';
import { Counselor, CouncilResponse, TensionPair } from '../types';
import { RollSeat } from '../utils/councilRoll';
import { CouncilSeat } from '../utils/councilSeats';
import { seatsFilled } from '../utils/summonProgress';
import ChamberFloor, { SittingStatus } from './ChamberFloor';
import OrderOfBusiness from './OrderOfBusiness';

interface ChamberProps {
  status: SittingStatus;
  roll: RollSeat[]; // Who will sit, shown while the council is summoned
  seats: CouncilSeat[];
  tensions: CouncilResponse['tensions'];
  sitting: number;
  estimatedMs: number;
  showTensions: boolean;
  selectedId: string | null;
  summary: string;
  amendment: string;
  onSeatClick: (counselor: Counselor) => void;
  onTensionClick: (pair: TensionPair) => void;
  onOpenRecord: () => void;
}

// Time since the council was last asked for an answer, ticking only while it's working.
function useElapsedWhile(working: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!working) return;
    const start = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(timer);
  }, [working]);
  return elapsed;
}

// The chamber page: the floor, and beside it (below it on a phone) the order of business.
const Chamber: React.FC<ChamberProps> = ({ status, roll, seats, tensions, sitting, estimatedMs, ...props }) => {
  const elapsed = useElapsedWhile(status !== 'sitting');
  const summoning = status === 'summoning';
  const secondsLeft = Math.max(0, Math.round((estimatedMs - elapsed) / 1000));

  const floor = (
    <ChamberFloor
      seats={summoning ? roll : seats}
      filled={summoning ? seatsFilled(elapsed, estimatedMs, roll.length) : seats.length}
      status={status}
      sitting={sitting}
      tensions={tensions}
      secondsLeft={secondsLeft}
      {...props}
    />
  );

  if (summoning) {
    return <div className="flex-grow min-h-0 overflow-y-auto px-4 md:px-8 pt-5 max-w-[900px] w-full mx-auto">{floor}</div>;
  }

  return (
    <div className="flex-grow min-h-0 overflow-y-auto md:overflow-hidden flex flex-col md:grid md:grid-cols-[330px_1fr]">
      <div className="px-4 pt-5 md:overflow-y-auto">{floor}</div>
      <aside className="md:order-first border-t md:border-t-0 md:border-r border-rule px-4 md:px-[26px] py-6 md:overflow-y-auto">
        <OrderOfBusiness
          seats={seats}
          tensions={tensions}
          selectedId={props.selectedId}
          disabled={status !== 'sitting'}
          onSeatClick={props.onSeatClick}
          onTensionClick={props.onTensionClick}
        />
      </aside>
    </div>
  );
};

export default Chamber;
