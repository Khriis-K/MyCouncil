
import React, { useState, useEffect } from 'react';
import Masthead, { Page, ThemeMode } from './components/Masthead';
import SetupPage from './components/SetupPage';
import TypeTable from './components/TypeTable';
import Chamber from './components/Chamber';
import BottomBar from './components/BottomBar';
import ImpressionSlip from './components/overlays/ImpressionSlip';
import CounselorDossier from './components/overlays/CounselorDossier';
import DebateOverlay from './components/overlays/DebateOverlay';
import DilemmaHistoryOverlay from './components/overlays/DilemmaHistoryOverlay';
import { Counselor, TensionPair, OverlayType, CouncilResponse, ReflectionFocus, DebateInterjection } from './types';
import { fetchCouncilAnalysis } from './services/CouncilService';
import { buildCounselorsFromResponse } from './utils/counselorMapper';
import { councilSeats } from './utils/councilSeats';
import { councilRoll } from './utils/councilRoll';
import { useChat } from './hooks/useChat';
import { buildMemorySources } from './utils/memorySources';

const estimateLoadTime = (dilemmaLength: number, councilSize: number): number => {
  const baseTime = 12000; // Adjusted base time (was 15000)
  const councilSizeFactor = councilSize * 2500; // Adjusted factor (was 3000)
  const dilemmaLengthFactor = dilemmaLength * 8; // Adjusted factor (was 10)
  return baseTime + councilSizeFactor + dilemmaLengthFactor;
};

const App: React.FC = () => {
  // --- State ---
  const [dilemma, setDilemma] = useState<string>('');
  const [councilData, setCouncilData] = useState<CouncilResponse | null>(null);
  const [selectedMBTI, setSelectedMBTI] = useState<string | null>('BALANCED');
  const [councilSize, setCouncilSize] = useState<number>(4);
  const [reflectionFocus, setReflectionFocus] = useState<ReflectionFocus>('Decision-Making');
  const [page, setPage] = useState<Page>('matter');
  const [viewState, setViewState] = useState<'INITIAL' | 'SEATED'>('INITIAL');
  const [isDebateMode, setIsDebateMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Loading state
  
  const { chatHistory, isTyping, sendMessage } = useChat();

  // Theme state - syncs with localStorage and OS preference
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mycouncil-theme');
      if (stored === 'light' || stored === 'dark' || stored === 'amoled') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  
  // Sync theme with document and localStorage
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'amoled');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'amoled') {
      document.documentElement.classList.add('amoled');
    }
    localStorage.setItem('mycouncil-theme', theme);
  }, [theme]);
  
  // Refinement context tracking
  const [additionalContext, setAdditionalContext] = useState<string>(''); 
  const [contextSummary, setContextSummary] = useState<string>(''); // AI-generated summary of previous refinements
  const [isRefining, setIsRefining] = useState(false);
  const [originalSummary, setOriginalSummary] = useState<string>(''); // Store initial summary, never changes
  const [refinementHistory, setRefinementHistory] = useState<{ text: string; timestamp: number }[]>([]); // Track all refinement contexts
  const [debateLog, setDebateLog] = useState<DebateInterjection[]>([]); // User interjections across all debates, for memory
  const memorySources = buildMemorySources({ chatHistory, refinements: refinementHistory, debateLog });
  const [estimatedTimeMs, setEstimatedTimeMs] = useState<number>(0);
  
  // Highlight states
  const [isBottomBarHighlighted, setIsBottomBarHighlighted] = useState(false);
  const [isSetupHighlighted, setIsSetupHighlighted] = useState(false);

  // Overlay Management
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>('NONE');
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [previousCounselor, setPreviousCounselor] = useState<Counselor | null>(null);
  const [selectedTensionPair, setSelectedTensionPair] = useState<TensionPair | null>(null);

  const seats = councilSeats(selectedMBTI, councilSize, councilData);
  const seatOf = (counselor: Counselor | null) => seats.find(s => s.counselor.id === counselor?.id);
  const selectedSeat = seatOf(selectedCounselor);
  const previousSeat = seatOf(previousCounselor);

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
    setPage('chamber');
    const timeEstimate = estimateLoadTime(dilemma.length, councilSize);
    setEstimatedTimeMs(timeEstimate);
    // removed setLoadingMessage to avoid subtitle on initial summon

    try {
      console.log("Calling fetchCouncilAnalysis...");
      const data = await fetchCouncilAnalysis(dilemma, selectedMBTI, councilSize, undefined, undefined, reflectionFocus);
      console.log("fetchCouncilAnalysis success:", data);

      setCouncilData(data);
      setOriginalSummary(data.summary); // Store the original summary
      setViewState('SEATED');

    } catch (error) {
      console.error("Error generating council:", error);
      const message = error instanceof Error ? error.message : "Failed to summon the council. Please try again.";
      alert(message);
      setPage('matter');
    } finally {
      console.log("Finally block - resetting isGenerating");
      setIsGenerating(false);
    }
  };

  const handleCounselorClick = (counselor: Counselor) => {
    if (selectedCounselor?.id === counselor.id) return; // Don't re-trigger same counselor
    
    // Lay down the impression slip first
    setSelectedCounselor(counselor);
    setActiveOverlay('COUNSELOR_IMPRESSION');
  };

  // Play the slip out, then clear it
  const dismissImpression = () => {
    setPreviousCounselor(selectedCounselor);
    setSelectedCounselor(null); // Clear immediately
    setTimeout(() => {
      setPreviousCounselor(null);
      setActiveOverlay('NONE');
    }, 300);
  };

  // Handle clicks outside the slip to close it
  useEffect(() => {
    if (activeOverlay !== 'COUNSELOR_IMPRESSION') return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is on the slip or a counselor's seat
      if (target.closest('[data-impression-slip]') || target.closest('[data-counselor-seat]')) {
        return;
      }
      dismissImpression();
    };

    // Use capture phase to ensure this runs before button onClick handlers
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [activeOverlay, selectedCounselor]);

  const handleRefine = async () => {
    if (!additionalContext.trim() || !councilData) return;
    
    console.log("handleRefine called with context:", additionalContext);
    setIsRefining(true);
    setIsDebateMode(false); // Auto-switch off Debate Mode on refine/refresh
    const timeEstimate = estimateLoadTime(dilemma.length + additionalContext.length, councilSize); // Add additional context length
    setEstimatedTimeMs(timeEstimate);
    // removed setLoadingMessage to avoid subtitle during refinement
    
    // Store refinement in history
    setRefinementHistory(prev => [...prev, { text: additionalContext, timestamp: Date.now() }]);
    
    try {
      // Call API with refinement data
      const data = await fetchCouncilAnalysis(
        dilemma,
        selectedMBTI,
        councilSize,
        contextSummary, // Previous summary (empty on first refinement)
        additionalContext, // New context
        reflectionFocus,
        memorySources // From this render, so it doesn't hold the refinement being sent (that's the query)
      );
      
      console.log("Refinement success:", data);
      
      // Extract new context summary from response if available
      if (data.context_summary) {
        setContextSummary(data.context_summary);
      }
      
      setCouncilData(data);
      
      // Clear additional context input
      setAdditionalContext('');
      
      // Close any open overlays
      closeOverlay();
      
    } catch (error) {
      console.error("Error refining perspective:", error);
      const message = error instanceof Error ? error.message : "Failed to refine perspective. Please try again.";
      alert(message);
    } finally {
      setIsRefining(false);
    }
  };

  const handleReadOpinion = () => {
    setActiveOverlay('COUNSELOR_DOSSIER');
  };

  const handleTensionClick = (pair: TensionPair) => {
    setSelectedTensionPair(pair);
    setActiveOverlay('DEBATE_DIALOGUE');
  };

  const handleCenterClick = () => {
    setActiveOverlay('DILEMMA_HISTORY');
  };

  const handleAddMoreContext = () => {
    setActiveOverlay('NONE');
    setPage('chamber');
    // Highlight bottom bar after panel closes (400ms animation)
    setTimeout(() => {
      setIsBottomBarHighlighted(true);
      setTimeout(() => {
        setIsBottomBarHighlighted(false);
      }, 2000); // Highlight for 2 seconds
    }, 400);
  };

  const handleRestartScenario = () => {
    // Reset all state
    setDilemma('');
    setCouncilData(null);
    setViewState('INITIAL');
    setOriginalSummary('');
    setContextSummary('');
    setRefinementHistory([]);
    setDebateLog([]);
    setAdditionalContext('');
    setActiveOverlay('NONE');
    setSelectedCounselor(null);
    setPreviousCounselor(null);
    setSelectedTensionPair(null);
    setIsDebateMode(false);
    setReflectionFocus('Decision-Making');
    
    // Back to setup, with the dilemma field highlighted
    setPage('matter');
    setTimeout(() => {
      setIsSetupHighlighted(true);
      setTimeout(() => {
        setIsSetupHighlighted(false);
      }, 2000); // Highlight for 2 seconds
    }, 400); // After panel slides out
  };

  const closeOverlay = () => {
    setActiveOverlay('NONE');
    setSelectedCounselor(null);
    setPreviousCounselor(null);
    setSelectedTensionPair(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-body bg-paper text-ink">

      <Masthead
        page={page}
        onNavigate={(next) => {
          closeOverlay(); // Panels belong to the page they were opened on
          setPage(next);
        }}
        onOpenRecord={handleCenterClick}
        hasCouncil={viewState === 'SEATED'}
        theme={theme}
        setThemeMode={setTheme}
      />

      {page === 'matter' ? (
        <main className="relative flex-grow min-h-0">
          {activeOverlay === 'MBTI_SELECTION' ? (
            <TypeTable
              initialType={selectedMBTI}
              onClose={closeOverlay}
              onConfirm={handleConfirmMBTI}
            />
          ) : (
            <SetupPage
              dilemma={dilemma}
              setDilemma={setDilemma}
              reflectionFocus={reflectionFocus}
              setReflectionFocus={setReflectionFocus}
              selectedMBTI={selectedMBTI}
              onSelectBalanced={() => setSelectedMBTI('BALANCED')}
              onOpenMBTI={handleOpenMBTI}
              councilSize={councilSize}
              setCouncilSize={setCouncilSize}
              onSummon={handleSummonCouncil}
              onRestart={handleRestartScenario}
              estimatedSeconds={Math.round(estimateLoadTime(dilemma.length, councilSize) / 1000)}
              isGenerating={isGenerating}
              hasCouncil={viewState === 'SEATED'}
              isHighlighted={isSetupHighlighted}
            />
          )}
        </main>
      ) : (
      <main className="relative flex-grow min-h-0 flex flex-col">

        {viewState === 'INITIAL' && !isGenerating ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center space-y-2 px-6">
            <p className="label">The chamber is empty</p>
            <p className="font-display italic text-2xl text-ink2">Summon the Council to begin reflection.</p>
          </div>
        ) : activeOverlay === 'COUNSELOR_DOSSIER' && selectedCounselor && selectedSeat && councilData ? (
          <CounselorDossier
            seat={selectedSeat}
            dynamicData={councilData.counselors.find(c => c.id === selectedCounselor.id)}
            onClose={closeOverlay}
            chatMessages={chatHistory[selectedCounselor.id] || []}
            isTyping={isTyping[selectedCounselor.id] || false}
            onSendMessage={(msg) => sendMessage(selectedCounselor.id, msg, dilemma, selectedMBTI, memorySources)}
          />
        ) : (
          <Chamber
            status={viewState === 'INITIAL' ? 'summoning' : isRefining ? 'refining' : 'sitting'}
            roll={councilRoll(selectedMBTI, councilSize)}
            seats={seats}
            tensions={councilData?.tensions ?? []}
            estimatedMs={estimatedTimeMs}
            showTensions={isDebateMode}
            selectedId={selectedCounselor?.id ?? null}
            summary={originalSummary || councilData?.summary || ''}
            amendment={contextSummary}
            onSeatClick={handleCounselorClick}
            onTensionClick={handleTensionClick}
            onOpenRecord={handleCenterClick}
          />
        )}

        {/* Debate/Tension Details */}
        {activeOverlay === 'DEBATE_DIALOGUE' && selectedTensionPair && councilData && (
          <DebateOverlay
            pair={selectedTensionPair}
            counselors={buildCounselorsFromResponse(selectedMBTI, councilSize, councilData)}
            dynamicData={councilData.tensions.find(t =>
              (t.counselor_ids[0] === selectedTensionPair.counselor1 && t.counselor_ids[1] === selectedTensionPair.counselor2) ||
              (t.counselor_ids[0] === selectedTensionPair.counselor2 && t.counselor_ids[1] === selectedTensionPair.counselor1)
            )}
            onClose={closeOverlay}
            dilemma={dilemma}
            memorySources={memorySources}
            onInterjection={i => setDebateLog(prev => [...prev, i])}
          />
        )}

        {/* Bottom Bar (the dossier has its own compose line) */}
        {activeOverlay !== 'COUNSELOR_DOSSIER' && (
        <BottomBar
          isDebateMode={isDebateMode}
          toggleDebateMode={() => setIsDebateMode(!isDebateMode)}
          isDisabled={viewState === 'INITIAL' || activeOverlay !== 'NONE'}
          onRefine={handleRefine}
          additionalContext={additionalContext}
          setAdditionalContext={setAdditionalContext}
          isRefining={isRefining}
          isHighlighted={isBottomBarHighlighted}
        />
        )}

      </main>
      )}

      {/* 3. Global Overlays Layer (Full Screen) */}

      {/* Counselor impression slip (step 1). The outgoing slip plays out before the next is laid down. */}
      {previousSeat && (
        <ImpressionSlip
          key={`exiting-${previousSeat.counselor.id}`}
          seat={previousSeat}
          onViewFull={handleReadOpinion}
          onClose={closeOverlay}
          isExiting={true}
        />
      )}

      {activeOverlay === 'COUNSELOR_IMPRESSION' && selectedSeat && !previousCounselor && (
        <ImpressionSlip
          key={`active-${selectedSeat.counselor.id}`}
          seat={selectedSeat}
          onViewFull={handleReadOpinion}
          onClose={dismissImpression}
        />
      )}

      {/* Dilemma History Overlay */}
      {activeOverlay === 'DILEMMA_HISTORY' && (
        <DilemmaHistoryOverlay
          dilemma={dilemma}
          originalSummary={originalSummary}
          refinementHistory={refinementHistory.map(r => r.text)}
          onClose={closeOverlay}
          onAddMoreContext={handleAddMoreContext}
          onRestartScenario={handleRestartScenario}
        />
      )}

    </div>
  );
};

export default App;
