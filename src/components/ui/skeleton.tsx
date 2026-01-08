import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-surface-secondary",
        className
      )}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("panel p-4 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}

function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div className={cn("panel p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="w-10 h-10 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonMetricCard };
