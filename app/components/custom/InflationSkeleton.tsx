const Block = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-stone-200 ${className}`} />
);

const InflationSkeleton = () => (
  <div className="space-y-4">
    {/* Basket summary card */}
    <div className="bg-white rounded-lg shadow-md p-6">
      <Block className="h-4 w-48 mb-3" />
      <Block className="h-9 w-40 mb-2" />
      <Block className="h-3 w-64" />
    </div>

    {/* Product selector */}
    <Block className="h-9 w-full sm:w-72" />

    {/* Metric cards */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-4">
          <Block className="h-3 w-16 mb-2" />
          <Block className="h-5 w-14" />
        </div>
      ))}
    </div>

    {/* Chart */}
    <div className="bg-gradient-to-br from-stone-100 to-orange-50 rounded-lg shadow-md p-4">
      <Block className="h-[340px] w-full bg-stone-200/70" />
    </div>

    {/* Change log */}
    <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Block key={i} className="h-8 w-full" />
      ))}
    </div>
  </div>
);

export default InflationSkeleton;
