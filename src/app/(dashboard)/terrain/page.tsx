import { Suspense } from 'react';
import { TerrainDashboard } from '@/components/terrain';

export const metadata = {
  title: 'Trade Terrain | Guardian Intel',
  description: 'Market intelligence and territory analysis for Guardian Storm Repair',
};

function TerrainSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-surface-secondary rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-surface-secondary rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-surface-secondary rounded-lg" />
    </div>
  );
}

export default function TerrainPage() {
  return (
    <Suspense fallback={<TerrainSkeleton />}>
      <TerrainDashboard />
    </Suspense>
  );
}
