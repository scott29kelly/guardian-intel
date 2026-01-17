'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { terrainData } from '@/lib/terrain/data-provider';
import { IntelligenceBrief } from '@/lib/terrain/types';
import { BriefViewer } from '@/components/terrain';

export default function BriefDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [brief, setBrief] = useState<IntelligenceBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    terrainData.initialize();
    const id = params.id as string;
    const foundBrief = terrainData.getBriefById(id);
    
    if (foundBrief) {
      setBrief(foundBrief);
    }
    setIsLoading(false);
  }, [params.id]);
  
  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 w-64 bg-surface-secondary rounded" />
        <div className="h-96 bg-surface-secondary rounded-lg" />
      </div>
    );
  }
  
  if (!brief) {
    return (
      <div className="p-6">
        <div className="glass-panel p-12 text-center">
          <h3 className="text-lg font-medium text-text-primary mb-2">Brief not found</h3>
          <p className="text-text-muted mb-4">The requested intelligence brief could not be found.</p>
          <button
            onClick={() => router.push('/terrain/briefs')}
            className="px-4 py-2 bg-intel-500/10 text-intel-400 rounded-lg hover:bg-intel-500/20 transition-colors"
          >
            Back to Archive
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <BriefViewer 
        brief={brief} 
        onBack={() => router.push('/terrain/briefs')}
      />
    </div>
  );
}
