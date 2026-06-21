import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="market-card overflow-hidden cursor-pointer group flex flex-col h-full min-h-[252px] shrink-0 animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-700" />
      
      {/* Content skeleton */}
      <div className="p-3.5 flex flex-col flex-1 min-h-[112px] bg-white dark:bg-slate-800">
        {/* Price */}
        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        
        {/* Title */}
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mt-2" />
        
        {/* Rating */}
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
        
        {/* Location */}
        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded mt-auto pt-2" />
      </div>
    </div>
  );
};

export default React.memo(SkeletonCard);
