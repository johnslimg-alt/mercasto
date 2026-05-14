import React from 'react';

// Single card skeleton — mimics an AdCard layout
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 animate-pulse">
      {/* Image placeholder */}
      <div className="h-48 bg-slate-200 dark:bg-slate-700 w-full" />
      <div className="p-4 space-y-3">
        {/* Badge row */}
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        {/* Title lines */}
        <div className="h-4 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700" />
        {/* Price */}
        <div className="h-6 w-1/3 rounded-lg bg-slate-300 dark:bg-slate-600" />
        {/* Location + date row */}
        <div className="flex justify-between pt-1">
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

// Grid of skeleton cards — drop-in replacement while ads are loading
export function SkeletonList({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Skeleton for the AdDetail page sidebar contact card
export function SkeletonDetailSidebar() {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="h-11 rounded-xl bg-slate-200 dark:bg-slate-700 w-full" />
      <div className="flex gap-3">
        <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex-1" />
        <div className="h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex-1" />
      </div>
      <div className="h-9 rounded-xl bg-green-100 dark:bg-green-900/30 w-full" />
    </div>
  );
}

export default SkeletonCard;
