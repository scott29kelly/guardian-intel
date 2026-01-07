import { useState } from 'react';
import { LeadsList, NanoReport, FullBrief } from './components/views';
import { mockLeadsList } from './data/mockLead';
import type { Lead } from './types';

type AppView = 'list' | 'nano' | 'full';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('list');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setCurrentView('nano');
  };

  const handleViewFull = () => {
    setCurrentView('full');
  };

  const handleBackToNano = () => {
    setCurrentView('nano');
  };

  const handleBackToList = () => {
    setSelectedLead(null);
    setCurrentView('list');
  };

  // Render based on current view
  if (currentView === 'list') {
    return <LeadsList leads={mockLeadsList} onSelectLead={handleSelectLead} />;
  }

  if (currentView === 'nano' && selectedLead) {
    return (
      <div>
        {/* Back button overlay */}
        <button
          onClick={handleBackToList}
          className="fixed top-4 left-4 z-[100] p-2 bg-guardian-800/90 backdrop-blur-sm rounded-full border border-guardian-700 hover:bg-guardian-700 transition-colors"
        >
          <svg className="w-5 h-5 text-guardian-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <NanoReport lead={selectedLead} onViewFull={handleViewFull} />
      </div>
    );
  }

  if (currentView === 'full' && selectedLead) {
    return <FullBrief lead={selectedLead} onBack={handleBackToNano} />;
  }

  // Fallback
  return <LeadsList leads={mockLeadsList} onSelectLead={handleSelectLead} />;
}

export default App;
