
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ReflectionSphere from './components/ReflectionSphere';
import BottomBar from './components/BottomBar';
import MBTIOverlay from './components/overlays/MBTIOverlay';
import InsightBar from './components/overlays/InsightBar';
import CounselorOverlay from './components/overlays/CounselorOverlay';
import DebateOverlay from './components/overlays/DebateOverlay';
import DilemmaHistoryOverlay from './components/overlays/DilemmaHistoryOverlay';
import { Counselor, TensionPair, OverlayType, CouncilResponse, ReflectionFocus } from './types';
import { COUNSELORS, TENSION_PAIRS } from './constants';
import { fetchCouncilAnalysis } from './services/CouncilService';
import { buildCounselorsFromResponse, buildTensionPairs } from './utils/counselorMapper';

const App: React.FC = () => {
  // --- State ---
  const [dilemma, setDilemma] = useState<string>('');
  const [councilData, setCouncilData] = useState<CouncilResponse | null>(null);
  const [selectedMBTI, setSelectedMBTI] = useState<string | null>('BALANCED');
  const [councilSize, setCouncilSize] = useState<number>(4);
  const [reflectionFocus, setReflectionFocus] = useState<ReflectionFocus>('Decision-Making');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewState, setViewState] = useState<'INITIAL' | 'SPHERE'>('INITIAL');
  const [isDebateMode, setIsDebateMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Loading state
  
  // Refinement context tracking
  const [additionalContext, setAdditionalContext] = useState<string>(''); 
  const [contextSummary, setContextSummary] = useState<string>(''); // AI-generated summary of previous refinements
  const [isRefining, setIsRefining] = useState(false);
  const [originalSummary, setOriginalSummary] = useState<string>(''); // Store initial summary, never changes
  const [isInitialRender, setIsInitialRender] = useState(false); // For initial counselor animation
  const [loadingMessage, setLoadingMessage] = useState<string>(''); // For center bubble during refinement
  const [refinementHistory, setRefinementHistory] = useState<string[]>([]); // Track all refinement contexts
  
  // Highlight states
  const [isBottomBarHighlighted, setIsBottomBarHighlighted] = useState(false);
  const [isSidebarHighlighted, setIsSidebarHighlighted] = useState(false);

  // Overlay Management
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>('NONE');
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [previousCounselor, setPreviousCounselor] = useState<Counselor | null>(null);
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
      console.log("Calling fetchCouncilAnalysis...");
      const data = await fetchCouncilAnalysis(dilemma, selectedMBTI, councilSize, undefined, undefined, reflectionFocus);
      console.log("fetchCouncilAnalysis success:", data);

      setCouncilData(data);
      setOriginalSummary(data.summary); // Store the original summary
      setViewState('SPHERE');
      setIsInitialRender(true); // Trigger initial animation
      
      // Reset animation flag after animation completes
      setTimeout(() => {
        setIsInitialRender(false);
      }, 800); // After staggered animations complete

      // On mobile/tablet you might close sidebar here, keeping open for desktop
      if (window.innerWidth < 1024) setSidebarOpen(false);

    } catch (error) {
      console.error("Error generating council:", error);
      const message = error instanceof Error ? error.message : "Failed to summon the council. Please try again.";
      alert(message);
    } finally {
      console.log("Finally block - resetting isGenerating");
      setIsGenerating(false);
    }
  };

  const handleCounselorClick = (counselor: Counselor) => {
    if (selectedCounselor?.id === counselor.id) return; // Don't re-trigger same counselor
    
    if (selectedCounselor) {
      // Trigger slide-out, then slide-in new one
      setPreviousCounselor(selectedCounselor);
      setSelectedCounselor(null); // Clear immediately to prevent duplicate rendering
      // CHANGE: Increased from 300 to 350 to prevents animation "snap-back"
      setTimeout(() => {
        setSelectedCounselor(counselor);
        setPreviousCounselor(null);
        setActiveOverlay('COUNSELOR_INSIGHT_BAR');
      }, 350); // Match slide-out animation duration
    } else {
      setSelectedCounselor(counselor);
      setActiveOverlay('COUNSELOR_INSIGHT_BAR');
    }
  };

  // Handle clicks outside InsightBar to close it
  useEffect(() => {
    if (activeOverlay !== 'COUNSELOR_INSIGHT_BAR') return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is on InsightBar or counselor spheres
      if (target.closest('[data-insight-bar]') || target.closest('[data-counselor-sphere]')) {
        return;
      }
      // Close the insight bar
      setPreviousCounselor(selectedCounselor);
      setSelectedCounselor(null); // Clear immediately
      setTimeout(() => {
        setPreviousCounselor(null);
        setActiveOverlay('NONE');
      }, 300);
    };

    // Use capture phase to ensure this runs before button onClick handlers
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [activeOverlay, selectedCounselor]);

  const handleRefine = async () => {
    if (!additionalContext.trim() || !councilData) return;
    
    console.log("handleRefine called with context:", additionalContext);
    setIsRefining(true);
    setLoadingMessage('Council reevaluating...');
    
    // Store refinement in history
    setRefinementHistory(prev => [...prev, additionalContext]);
    
    try {
      // Call API with refinement data
      const data = await fetchCouncilAnalysis(
        dilemma,
        selectedMBTI,
        councilSize,
        contextSummary, // Previous summary (empty on first refinement)
        additionalContext, // New context
        reflectionFocus
      );
      
      console.log("Refinement success:", data);
      
      // Extract new context summary from response if available
      if (data.context_summary) {
        setContextSummary(data.context_summary);
      }
      
      // Clear loading message
      setLoadingMessage('');
      
      // Update council data (triggers fade transition)
      setCouncilData(data);
      
      // Trigger slide-in animation
      setIsInitialRender(true);
      setTimeout(() => {
        setIsInitialRender(false);
      }, 800);
      
      // Clear additional context input
      setAdditionalContext('');
      
      // Close any open overlays
      closeOverlay();
      
    } catch (error) {
      console.error("Error refining perspective:", error);
      const message = error instanceof Error ? error.message : "Failed to refine perspective. Please try again.";
      alert(message);
      setLoadingMessage(''); // Clear loading message on error
    } finally {
      setIsRefining(false);
    }
  };

  const handleViewFullPanel = () => {
    setActiveOverlay('COUNSELOR_PANEL');
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
    setAdditionalContext('');
    setActiveOverlay('NONE');
    setSelectedCounselor(null);
    setPreviousCounselor(null);
    setSelectedTensionPair(null);
    setIsDebateMode(false);
    setReflectionFocus('Decision-Making');
    
    // Open sidebar and highlight textarea
    setSidebarOpen(true);
    setTimeout(() => {
      setIsSidebarHighlighted(true);
      setTimeout(() => {
        setIsSidebarHighlighted(false);
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
    <div className="flex h-screen w-screen bg-background-dark overflow-hidden text-slate-200 font-sans">

      {/* 1. Sidebar Configuration */}
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        dilemma={dilemma}
        setDilemma={setDilemma}
        selectedMBTI={selectedMBTI}
        councilSize={councilSize}
        setCouncilSize={setCouncilSize}
        reflectionFocus={reflectionFocus}
        setReflectionFocus={setReflectionFocus}
        onOpenMBTI={handleOpenMBTI}
        onSelectMBTI={(val) => {
          setSelectedMBTI(val);
          if (val === 'BALANCED') setActiveOverlay('NONE');
        }}
        onSummon={handleSummonCouncil}
        onRestart={handleRestartScenario}
        isGenerating={isGenerating}
        isMBTIOverlayOpen={activeOverlay === 'MBTI_SELECTION'}
        isHighlighted={isSidebarHighlighted}
        hasCouncil={viewState === 'SPHERE'}
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
              dilemmaSummary={originalSummary || councilData?.summary || ''}
              contextSummary={loadingMessage || contextSummary}
              counselors={buildCounselorsFromResponse(selectedMBTI, councilSize, councilData)}
              councilData={councilData}
              isDebateMode={isDebateMode}
              tensionPairs={buildTensionPairs(councilData)}
              onCounselorClick={handleCounselorClick}
              onTensionClick={handleTensionClick}
              onCenterClick={handleCenterClick}
              isInitialRender={isInitialRender}
              isRefining={isRefining}
              reflectionFocus={reflectionFocus}
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
          isDisabled={viewState === 'INITIAL' || activeOverlay !== 'NONE'}
          onRefine={handleRefine}
          additionalContext={additionalContext}
          setAdditionalContext={setAdditionalContext}
          isRefining={isRefining}
          isHighlighted={isBottomBarHighlighted}
        />

      </main>

      {/* 3. Global Overlays Layer (Full Screen) */}

      {/* Counselor Insight Bar (Step 1) - Show exiting bar if transitioning */}
      {previousCounselor && councilData && (
        <InsightBar
          key={`exiting-${previousCounselor.id}`}
          counselor={previousCounselor}
          dynamicData={councilData.counselors.find(c => c.id === previousCounselor.id)}
          onViewFull={handleViewFullPanel}
          onClose={closeOverlay}
          isExiting={true}
        />
      )}
      
      {activeOverlay === 'COUNSELOR_INSIGHT_BAR' && selectedCounselor && councilData && !previousCounselor && (
        <InsightBar
          key={`active-${selectedCounselor.id}`}
          counselor={selectedCounselor}
          dynamicData={councilData.counselors.find(c => c.id === selectedCounselor.id)}
          onViewFull={handleViewFullPanel}
          onClose={closeOverlay}
        />
      )}

      {/* Counselor Side Panel (Step 2) */}
      {activeOverlay === 'COUNSELOR_PANEL' && selectedCounselor && councilData && (
        <CounselorOverlay
          counselor={selectedCounselor}
          dynamicData={councilData.counselors.find(c => c.id === selectedCounselor.id)}
          onClose={closeOverlay}
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
        />
      )}

      {/* Dilemma History Overlay */}
      {activeOverlay === 'DILEMMA_HISTORY' && (
        <DilemmaHistoryOverlay
          dilemma={dilemma}
          originalSummary={originalSummary}
          refinementHistory={refinementHistory}
          onClose={closeOverlay}
          onAddMoreContext={handleAddMoreContext}
          onRestartScenario={handleRestartScenario}
        />
      )}

    </div>
  );
};

export default App;
