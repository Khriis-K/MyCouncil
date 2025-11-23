
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ReflectionSphere from './components/ReflectionSphere';
import BottomBar from './components/BottomBar';
import MBTIOverlay from './components/overlays/MBTIOverlay';
import CounselorOverlay from './components/overlays/CounselorOverlay';
import DebateOverlay from './components/overlays/DebateOverlay';
import { Counselor, TensionPair, OverlayType, CouncilResponse } from './types';
import { COUNSELORS, TENSION_PAIRS } from './constants';
import { fetchCouncilAnalysis } from './services/CouncilService';

const App: React.FC = () => {
  // --- State ---
  const [dilemma, setDilemma] = useState<string>('');
  const [councilData, setCouncilData] = useState<CouncilResponse | null>(null);
  const [selectedMBTI, setSelectedMBTI] = useState<string | null>('BALANCED');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewState, setViewState] = useState<'INITIAL' | 'SPHERE'>('INITIAL');
  const [isDebateMode, setIsDebateMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Loading state

  // Overlay Management
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>('NONE');
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [selectedTensionPair, setSelectedTensionPair] = useState<TensionPair | null>(null);

  // --- Handlers ---

  const handleOpenMBTI = () => {
    setActiveOverlay('MBTI_SELECTION');
  };

  const handleConfirmMBTI = (code: string) => {
    setSelectedMBTI(code);
    setActiveOverlay('NONE');
  };

  const handleSummonCouncil = async () => {
    console.log("handleSummonCouncil called");
    if (!dilemma) {
      console.log("Dilemma is empty");
      alert("Please enter a dilemma first.");
      return;
    }

    console.log("Setting isGenerating to true");
    setIsGenerating(true);

    try {
      // Read from .env.local
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log("API Key retrieved:", apiKey ? "Yes (hidden)" : "No");

      if (!apiKey) {
        alert("API Key not found. Please check .env.local");
        return;
      }

      console.log("Calling fetchCouncilAnalysis...");
      const data = await fetchCouncilAnalysis(apiKey, dilemma, selectedMBTI);
      console.log("fetchCouncilAnalysis success:", data);

      setCouncilData(data);
      setViewState('SPHERE');

      // On mobile/tablet you might close sidebar here, keeping open for desktop
      if (window.innerWidth < 1024) setSidebarOpen(false);

    } catch (error) {
      console.error("Error generating council:", error);
      alert("Failed to summon the council. Please try again.");
    } finally {
      console.log("Finally block - resetting isGenerating");
      setIsGenerating(false);
    }
  };

  const handleCounselorClick = (counselor: Counselor) => {
    setSelectedCounselor(counselor);
    setActiveOverlay('COUNSELOR_CARD');
  };

  const handleTensionClick = (pair: TensionPair) => {
    setSelectedTensionPair(pair);
    setActiveOverlay('DEBATE_DIALOGUE');
  };

  const closeOverlay = () => {
    setActiveOverlay('NONE');
    setSelectedCounselor(null);
    setSelectedTensionPair(null);
  };

  return (
    <div className="flex h-screen w-screen bg-background-dark overflow-hidden text-slate-200 font-sans">

      {/* 1. Sidebar Configuration */}
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        dilemma={dilemma}
        setDilemma={setDilemma}
        selectedMBTI={selectedMBTI}
        onOpenMBTI={handleOpenMBTI}
        onSelectMBTI={(val) => {
          setSelectedMBTI(val);
          if (val === 'BALANCED') setActiveOverlay('NONE');
        }}
        onSummon={handleSummonCouncil}
        isGenerating={isGenerating}
        isMBTIOverlayOpen={activeOverlay === 'MBTI_SELECTION'}
      />

      {/* 2. Main Content Area */}
      <main className={`relative transition-all duration-300 h-full flex flex-col ${sidebarOpen ? 'ml-[360px] w-[calc(100%-360px)]' : 'ml-0 w-full'}`}>

        {/* Background Grid/Effects */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="w-full h-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
        </div>

        {/* View Content */}
        <div className="flex-grow flex items-center justify-center relative z-10">
          {viewState === 'INITIAL' ? (
            <div className="text-center space-y-4 opacity-60 animate-pulse-slow">
              <div className="w-24 h-24 rounded-full bg-slate-800 mx-auto flex items-center justify-center border border-slate-700">
                <span className="material-symbols-outlined text-4xl text-slate-600">psychology</span>
              </div>
              <p className="text-lg font-medium">Summon the Council to begin reflection.</p>
            </div>
          ) : (
            <ReflectionSphere
              dilemma={dilemma}
              dilemmaSummary={councilData?.summary || ''}
              counselors={COUNSELORS} // We still pass static config for colors/icons, but we'll need to merge with dynamic data in the component or here
              councilData={councilData}
              isDebateMode={isDebateMode}
              tensionPairs={TENSION_PAIRS} // Same here, might need to merge
              onCounselorClick={handleCounselorClick}
              onTensionClick={handleTensionClick}
            />
          )}
        </div>

        {/* MBTI Selection Overlay - Inside Main to respect Sidebar */}
        {activeOverlay === 'MBTI_SELECTION' && (
          <MBTIOverlay
            onClose={closeOverlay}
            onConfirm={handleConfirmMBTI}
          />
        )}

        {/* Bottom Bar */}
        <BottomBar
          isDebateMode={isDebateMode}
          toggleDebateMode={() => setIsDebateMode(!isDebateMode)}
          isDisabled={activeOverlay !== 'NONE'}
          onRefine={() => { }}
        />

      </main>

      {/* 3. Global Overlays Layer (Full Screen) */}

      {/* Counselor Details */}
      {activeOverlay === 'COUNSELOR_CARD' && selectedCounselor && (
        <CounselorOverlay
          counselor={selectedCounselor}
          dynamicData={councilData?.counselors.find(c => c.id === selectedCounselor.id)}
          onClose={closeOverlay}
        />
      )}

      {/* Debate/Tension Details */}
      {activeOverlay === 'DEBATE_DIALOGUE' && selectedTensionPair && (
        <DebateOverlay
          pair={selectedTensionPair}
          counselors={COUNSELORS}
          dynamicData={councilData?.tensions.find(t =>
            (t.counselor_ids[0] === selectedTensionPair.counselor1 && t.counselor_ids[1] === selectedTensionPair.counselor2) ||
            (t.counselor_ids[0] === selectedTensionPair.counselor2 && t.counselor_ids[1] === selectedTensionPair.counselor1)
          )}
          onClose={closeOverlay}
        />
      )}

    </div>
  );
};

export default App;
