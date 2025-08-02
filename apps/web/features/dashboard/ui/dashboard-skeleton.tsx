import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="size-full bg-white px-8">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="px-6 pt-4">
              <Skeleton className="mb-1.5 h-7 w-24" />
              <Skeleton className="mb-7 h-4 w-96" />
              <div className="grid grid-cols-2 gap-5">
                <div className="nice-gray-border row-span-2 h-[420px] rounded-2xl p-4">
                  <div className="mb-6 flex items-center gap-3">
                    <Skeleton className="size-5" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="mb-4 h-10 w-full rounded-lg" />
                  <div className="mb-4 flex items-center gap-3">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-7 w-16 rounded-full" />
                  </div>
                  <div className="relative h-64">
                    <Skeleton className="h-full w-full" />
                  </div>
                </div>
                <div className="nice-gray-border flex h-[197px] flex-col justify-between rounded-2xl p-4">
                  <div>
                    <div className="mb-4 flex items-center gap-1.5">
                      <Skeleton className="size-5" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-9 w-16" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="nice-gray-border flex h-[197px] flex-col justify-between rounded-2xl p-4">
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <Skeleton className="mx-1 size-2 rounded-full" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                    <Skeleton className="h-9 w-12" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </div>
          <div className="nice-gray-border flex min-h-[440px] flex-col rounded-2xl px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-20 rounded" />
            </div>
            <div className="flex-1 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 pl-1 ${
                    i < 4 ? "border-b border-gray-200 pb-4" : "pb-2"
                  }`}
                >
                  <Skeleton className="mt-1 size-2 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="mb-1 h-3 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
