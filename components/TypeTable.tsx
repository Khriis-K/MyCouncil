import React, { useEffect, useState } from 'react';
import { MBTIType } from '../types';
import { MBTI_TYPES } from '../constants';
import { TYPE_DETAILS, AVATAR_URLS, TRAIT_DEFINITIONS, BEHAVIOR_DEFINITIONS, WEAKNESS_DEFINITIONS } from '../data/mbtiData';
import { groupColor } from '../utils/groupColor';

interface TypeTableProps {
  initialType: string | null;
  onClose: () => void;
  onConfirm: (code: string) => void;
}

const TEMPERAMENTS: { group: MBTIType['group']; label: string; note: string }[] = [
  { group: 'analyst', label: 'Analysts', note: 'Strategy and systems' },
  { group: 'diplomat', label: 'Diplomats', note: 'People and meaning' },
  { group: 'sentinel', label: 'Sentinels', note: 'Duty and order' },
  { group: 'explorer', label: 'Explorers', note: 'Action and craft' },
];

const SCALE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
const STATEMENT_COUNT = 4;

const DICHOTOMIES: { left: string; right: string; key: 'ie' | 'sn' | 'tf' | 'jp'; leftDef: string; rightDef: string }[] = [
  { left: 'Introversion (I)', right: 'Extraversion (E)', key: 'ie', leftDef: 'Gains energy from solitary reflection and internal ideas.', rightDef: 'Gains energy from social interaction and the external world.' },
  { left: 'Sensing (S)', right: 'Intuition (N)', key: 'sn', leftDef: 'Focuses on facts, details, and present reality.', rightDef: 'Focuses on patterns, possibilities, and the future.' },
  { left: 'Thinking (T)', right: 'Feeling (F)', key: 'tf', leftDef: 'Makes decisions based on logic and objective analysis.', rightDef: 'Makes decisions based on values and impact on people.' },
  { left: 'Judging (J)', right: 'Perceiving (P)', key: 'jp', leftDef: 'Prefers structure, plans, and closure.', rightDef: 'Prefers flexibility, spontaneity, and keeping options open.' },
];

type Section = 'traits' | 'dichotomies' | 'behaviors' | 'weaknesses';

// Draw a few of the type's statements at random, as the old one-at-a-time validator did.
const drawStatements = (questions: string[]) =>
  [...questions].sort(() => Math.random() - 0.5).slice(0, STATEMENT_COUNT);

const TypeTable: React.FC<TypeTableProps> = ({ initialType, onClose, onConfirm }) => {
  const [selectedType, setSelectedType] = useState<MBTIType | null>(
    () => MBTI_TYPES.find(t => t.code === initialType) ?? null
  );
  const [statements, setStatements] = useState<string[]>([]);
  // Answers on the 1 (strongly disagree) to 5 (strongly agree) scale, by statement.
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [openSection, setOpenSection] = useState<Section | null>(null);

  const details = selectedType ? (TYPE_DETAILS[selectedType.code] || TYPE_DETAILS.DEFAULT) : null;
  const accent = selectedType ? groupColor(selectedType.code) : 'var(--ink2)';

  useEffect(() => {
    if (!details) return;
    setStatements(drawStatements(details.validationQuestions));
    setAnswers({});
    setOpenSection(null);
  }, [selectedType]);

  // Each answer moves confidence 5% per step away from neutral, starting from 50%.
  const confidence = Math.min(99, Math.max(1,
    50 + Object.values(answers).reduce((sum, v) => sum + (v - 3) * 5, 0)
  ));

  const sectionToggle = (section: Section, title: string, tone = '') => (
    <div className="flex items-center justify-between border-b border-rule pb-1">
      <h4 className={`label !text-[10px] ${tone}`}>{title}</h4>
      <button
        type="button"
        onClick={() => setOpenSection(openSection === section ? null : section)}
        aria-expanded={openSection === section}
        aria-label={`Explain ${title.toLowerCase()}`}
        className={`hover:text-ink ${openSection === section ? 'text-ink' : 'text-ink2'}`}
      >
        <span className="material-symbols-outlined text-sm">help</span>
      </button>
    </div>
  );

  const definition = (term: string, text: string, rule = 'border-rule') => (
    <div key={term} className={`border-l-2 ${rule} pl-2`}>
      <p className="font-semibold">{term}</p>
      <p className="leading-relaxed">{text}</p>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid lg:grid-cols-[1fr_330px] gap-10 lg:gap-14 px-5 py-8 md:pl-24 md:pr-14 md:py-10">
        <section>
          <div className="label">Your temperament</div>
          <h2 className="display mt-1.5 mb-6">Which type <em>reads</em> most like you?</h2>

          <div role="radiogroup" aria-label="MBTI type" className="border-b border-rule">
            {TEMPERAMENTS.map(({ group, label, note }) => (
              <div key={group} className="grid grid-cols-4 md:grid-cols-[110px_repeat(4,1fr)] border-t border-rule">
                <div className="col-span-4 md:col-span-1 pt-3 pb-1 md:py-3.5 md:pr-3">
                  <span className="label block">{label}</span>
                  <span className="text-[12.5px] italic text-ink2 hidden md:block">{note}</span>
                </div>
                {MBTI_TYPES.filter(t => t.group === group).map(type => {
                  const on = selectedType?.code === type.code;
                  return (
                    <button
                      key={type.code}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSelectedType(type)}
                      className={`text-left px-2 md:px-3.5 py-3 border-l border-rule first-of-type:border-l-0 md:first-of-type:border-l ${on ? 'bg-ink text-paper' : 'hover:bg-paper2'}`}
                    >
                      <b className="font-display text-[19px] md:text-[22px] font-semibold block leading-tight">{type.code}</b>
                      <span className={`text-[11px] md:text-[13px] ${on ? 'text-paper' : 'text-ink2'}`}>{type.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {selectedType && details && (
            <details className="mt-5 group">
              <summary className="label cursor-pointer list-none flex items-center gap-2">
                <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-90">chevron_right</span>
                About the {selectedType.name}
              </summary>

              <div className="mt-4 flex flex-col gap-5">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-full shrink-0 overflow-hidden border-[1.6px] bg-paper2" style={{ borderColor: accent }}>
                    <img src={AVATAR_URLS[selectedType.code] || AVATAR_URLS.INTJ} alt={`${selectedType.name} avatar`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[14.5px] leading-relaxed">{details.description}</p>
                    <p className="font-display text-base italic text-ink2 border-l-2 border-rule pl-3">"{details.quote}"</p>
                  </div>
                </div>

                {openSection && (
                  <div className="p-3 border border-rule bg-paper2 space-y-2 text-[13px]">
                    {openSection === 'traits' && details.traits.map(t => definition(t, TRAIT_DEFINITIONS[t] || t))}
                    {openSection === 'dichotomies' && DICHOTOMIES.map(d => (
                      <div key={d.key} className="border-l-2 border-rule pl-2">
                        <p className="font-semibold">{d.left} vs {d.right}</p>
                        <p className="leading-relaxed">{d.leftDef}</p>
                        <p className="leading-relaxed">{d.rightDef}</p>
                      </div>
                    ))}
                    {openSection === 'behaviors' && details.commonBehaviors.map(b => definition(b, BEHAVIOR_DEFINITIONS[b] || b))}
                    {openSection === 'weaknesses' && details.weaknesses.map(w => definition(w, WEAKNESS_DEFINITIONS[w] || w, 'border-seal'))}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    {sectionToggle('traits', 'Key traits')}
                    <div className="flex flex-wrap gap-2">
                      {details.traits.map(t => (
                        <span key={t} className="px-2.5 py-0.5 rounded-full text-[12px] border whitespace-nowrap" style={{ borderColor: accent }}>{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {sectionToggle('dichotomies', 'Dichotomies')}
                    {DICHOTOMIES.map(d => {
                      const value = details.dichotomyValues[d.key];
                      const isLeft = value < 50;
                      return (
                        <div key={d.key} className="flex items-center text-xs py-1">
                          <span className="w-28 truncate text-right" style={{ color: isLeft ? accent : 'var(--ink2)' }}>{d.left}</span>
                          <div className="mx-3 flex-grow h-1.5 bg-paper2 border border-rule relative overflow-hidden">
                            <div className="absolute left-1/2 inset-y-0 w-px bg-rule" />
                            <div className="absolute inset-y-0" style={{ left: isLeft ? `${value}%` : '50%', width: `${Math.abs(value - 50)}%`, backgroundColor: accent }} />
                          </div>
                          <span className="w-28 truncate" style={{ color: !isLeft ? accent : 'var(--ink2)' }}>{d.right}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2">
                    {sectionToggle('behaviors', 'Common behaviors')}
                    <ul className="space-y-1 text-[13px]">
                      {details.commonBehaviors.map(b => <li key={b}>{b}</li>)}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2">
                    {sectionToggle('weaknesses', 'Weaknesses', '!text-seal')}
                    <ul className="space-y-1 text-[13px]">
                      {details.weaknesses.map(w => <li key={w}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          )}
        </section>

        <aside className="flex flex-col">
          {selectedType ? (
            <>
              <div className="flex justify-between items-baseline gap-4 mb-3.5">
                <div className="label">Not sure? Check against four statements</div>
                <div className="label !text-ink shrink-0">Confidence {confidence}%</div>
              </div>
              {statements.map((statement, i) => (
                <div key={statement} className="py-3.5 border-t border-rule">
                  <p className="text-[15px] mb-2.5">{statement}</p>
                  <div className="flex justify-between items-center" role="radiogroup" aria-label={statement}>
                    {SCALE.map((label, s) => {
                      const on = answers[i] === s + 1;
                      return (
                        <button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={label}
                          onClick={() => setAnswers(prev => ({ ...prev, [i]: s + 1 }))}
                          className={`w-[18px] h-[18px] rounded-full border ${on ? 'bg-seal border-seal' : 'border-ink2 hover:border-ink'}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11.5px] italic text-ink2 mt-1">
                    <span>Strongly disagree</span><span>Strongly agree</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-[22px] mt-[18px] pt-[18px] border-t border-rule">
                <button className="btn-seal" onClick={() => onConfirm(selectedType.code)}>Confirm {selectedType.code}</button>
                <button className="btn-link" onClick={onClose}>Back</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] italic text-ink2">Pick a type to check it against four statements.</p>
              <div className="mt-[18px]">
                <button className="btn-link" onClick={onClose}>Back</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default TypeTable;
