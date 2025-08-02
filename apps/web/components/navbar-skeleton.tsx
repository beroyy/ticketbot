import { Skeleton } from "@/components/ui/skeleton";

export function NavbarSkeleton() {
  return (
    <nav className="z-50 h-[76px] bg-[#06234A] px-9 py-3.5 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Skeleton className="h-16 w-[200px] bg-white/10" />
          <div className="flex space-x-6">
            <Skeleton className="h-10 w-16 rounded-lg bg-white/10" />
            <Skeleton className="h-10 w-20 rounded-lg bg-white/10" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-40 rounded-full bg-white/10" />
        </div>
      </div>
    </nav>
  );
}
