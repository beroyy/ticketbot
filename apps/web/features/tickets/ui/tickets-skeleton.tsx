import { Skeleton } from "@/components/ui/skeleton";

export function TicketsSkeleton({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <div className="space-y-4">
      {!isCompact && (
        <div className="mb-4 border-b pb-4">
          <Skeleton className="mb-1 h-8 w-24" />
          <Skeleton className="h-5 w-96" />
        </div>
      )}
      <div className="mb-4 flex items-center justify-between pt-1.5">
        <Skeleton className={`h-10 rounded-xl ${isCompact ? "w-full" : "w-1/3"}`} />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <TicketRowSkeleton key={i} isCompact={isCompact} />
        ))}
      </div>
    </div>
  );
}

function TicketRowSkeleton({ isCompact }: { isCompact?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Skeleton className="size-2 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-full max-w-[400px]" />
      </div>
      {!isCompact && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      )}
    </div>
  );
}

export function TicketDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-auto p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "" : "justify-end"}`}>
            <div className={`max-w-[70%] space-y-2 ${i % 2 === 0 ? "" : "items-end"}`}>
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className={`h-16 w-full rounded-lg ${i % 2 === 0 ? "" : "ml-10"}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
