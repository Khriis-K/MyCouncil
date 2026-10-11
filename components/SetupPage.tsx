import React, { useEffect, useRef } from 'react';
import { MBTI_TYPES, REFLECTION_FOCUS_OPTIONS } from '../constants';
import { ReflectionFocus } from '../types';
import { councilRoll } from '../utils/councilRoll';

// Mirrors the server's limit on the dilemma (server/schemas.ts).
const DILEMMA_MAX = 1000;
const SEAT_COUNTS = [3, 4, 5, 6, 7];
const SEAT_WORDS: Record<number, string> = { 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven' };

interface SetupPageProps {
  dilemma: string;
  setDilemma: (val: string) => void;
  reflectionFocus: ReflectionFocus;
  setReflectionFocus: (val: ReflectionFocus) => void;
  selectedMBTI: string | null;
  onSelectBalanced: () => void;
  onOpenMBTI: () => void;
  councilSize: number;
  setCouncilSize: (val: number) => void;
  onSummon: () => void;
  onRestart: () => void;
  estimatedSeconds: number;
  isGenerating: boolean;
  hasCouncil: boolean;
  isHighlighted: boolean;
}

// A ledger choice: a native radio with the mock's ruled marker drawn beside it.
const Choice: React.FC<{
  name: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  children: React.ReactNode;
  note?: React.ReactNode;
}> = ({ name, checked, disabled, onChange, children, note }) => (
  <div className={`grid grid-cols-[14px_1fr] gap-x-2 text-[15px] ${disabled ? 'opacity-50' : ''}`}>
    <label className={`col-span-2 grid grid-cols-[14px_1fr] gap-x-2 items-baseline ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="peer sr-only" />
      <span className={`w-[9px] h-[9px] rounded-full border border-ink -translate-y-px peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${checked ? 'bg-ink' : ''}`} />
      <span>{children}</span>
    </label>
    {/* Outside the label, so a link in the note isn't nested in the radio's label */}
    {note && <small className="col-start-2 block text-[12.5px] italic text-ink2 -mt-0.5">{note}</small>}
  </div>
);

const SetupPage: React.FC<SetupPageProps> = ({
  dilemma,
  setDilemma,
  reflectionFocus,
  setReflectionFocus,
  selectedMBTI,
  onSelectBalanced,
  onOpenMBTI,
  councilSize,
  setCouncilSize,
  onSummon,
  onRestart,
  estimatedSeconds,
  isGenerating,
  hasCouncil,
  isHighlighted,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const locked = isGenerating || hasCouncil;
  const isBalanced = !selectedMBTI || selectedMBTI === 'BALANCED';
  const mbtiType = MBTI_TYPES.find(t => t.code === selectedMBTI);
  const roll = councilRoll(selectedMBTI, councilSize);

  useEffect(() => {
    if (isHighlighted) textareaRef.current?.focus();
  }, [isHighlighted]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid lg:grid-cols-[1fr_300px] gap-10 lg:gap-16 px-5 py-8 md:pl-24 md:pr-14 md:py-11">
        <section>
          <label htmlFor="dilemma" className="label block">The matter before the council</label>
          <textarea
            ref={textareaRef}
            id="dilemma"
            rows={4}
            maxLength={DILEMMA_MAX}
            className={`w-full mt-2.5 pt-3.5 pb-[18px] bg-transparent text-ink text-[22px] leading-normal border-b border-ink resize-none focus:outline-none placeholder:text-ink2 placeholder:italic ${isHighlighted ? 'ring-2 ring-seal' : ''} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder="I've been offered a new job in a different city. It's a great career opportunity but..."
            value={dilemma}
            onChange={(e) => setDilemma(e.target.value)}
            disabled={locked}
          />
          <div className="flex justify-between gap-4 mt-2 text-[13px] italic text-ink2">
            <span>Write it the way you'd explain it to a friend.</span>
            <span className="shrink-0">{dilemma.length} / {DILEMMA_MAX}</span>
          </div>

          {/* The ledger: focus, temperament and seats */}
          <div className="grid md:grid-cols-[1.25fr_1fr_.8fr] mt-[34px] border-y border-rule divide-y md:divide-y-0 md:divide-x divide-rule">
            <fieldset className="px-[18px] pt-4 pb-[18px] flex flex-col gap-2.5">
              <legend className="label float-left mb-2.5">Reflection focus</legend>
              {REFLECTION_FOCUS_OPTIONS.map(option => (
                <Choice
                  key={option.value}
                  name="focus"
                  checked={reflectionFocus === option.value}
                  disabled={locked}
                  onChange={() => setReflectionFocus(option.value)}
                  note={option.description}
                >
                  {option.label}
                </Choice>
              ))}
            </fieldset>

            <fieldset className="px-[18px] pt-4 pb-[18px] flex flex-col gap-2.5">
              <legend className="label float-left mb-2.5">Your temperament</legend>
              <Choice name="temperament" checked={isBalanced} disabled={locked} onChange={onSelectBalanced} note="All four temperaments">
                Balanced panel
              </Choice>
              <Choice
                name="temperament"
                checked={!isBalanced}
                disabled={locked}
                onChange={onOpenMBTI}
                note={
                  <button type="button" className="italic underline underline-offset-2 disabled:cursor-not-allowed" onClick={onOpenMBTI} disabled={locked}>
                    {isBalanced ? 'Choose your type' : 'Change type'}
                  </button>
                }
              >
                {isBalanced ? 'Your MBTI type' : `${selectedMBTI}${mbtiType ? `, the ${mbtiType.name}` : ''}`}
              </Choice>
            </fieldset>

            <fieldset className="px-[18px] pt-4 pb-[18px] flex flex-col gap-2.5">
              <legend className="label float-left mb-2.5">Seats</legend>
              <div className="flex gap-2">
                {SEAT_COUNTS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCouncilSize(n)}
                    disabled={locked}
                    aria-pressed={n === councilSize}
                    aria-label={`${n} seats`}
                    className={`w-[30px] h-[30px] rounded-full grid place-items-center font-display text-[17px] border disabled:opacity-50 disabled:cursor-not-allowed ${
                      n === councilSize ? 'bg-ink border-ink text-paper' : 'border-rule text-ink hover:border-ink'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-[13px] italic text-ink2">{SEAT_WORDS[councilSize]} counselors</span>
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center gap-x-[22px] gap-y-3 mt-[30px]">
            {hasCouncil ? (
              <button onClick={onRestart} className="btn-outline">Restart scenario</button>
            ) : (
              <button onClick={onSummon} disabled={isGenerating} className="btn-seal">
                {isGenerating ? 'The council is being seated' : 'Summon the council'}
              </button>
            )}
            <i className="text-[13.5px] text-ink2">
              {hasCouncil ? 'The council has sat. Restart to bring a new matter.' : `Takes about ${estimatedSeconds} seconds`}
            </i>
          </div>
        </section>

        <aside className="lg:border-l border-t lg:border-t-0 border-rule pt-6 lg:pt-0 lg:pl-7 flex flex-col gap-3.5">
          <h2 className="label">Who will sit</h2>
          <ol>
            {roll.map(seat => (
              <li key={seat.numeral} className="grid grid-cols-[30px_1fr] py-[9px] border-b border-rule">
                <span className="font-display text-[17px] text-ink2">{seat.numeral}</span>
                <div>
                  <b className="font-display text-[19px] font-semibold block leading-tight">{seat.name}</b>
                  <small className="font-label text-[11px] tracking-[0.08em] uppercase text-ink2">{seat.type} · {seat.role}</small>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-[13px] italic text-ink2">
            Seats fill in priority order for your type. Add seats to hear from temperaments further from your own.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default SetupPage;
