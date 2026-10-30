import type { PairReport, HeatCell } from '../shared/partnership';
export function geohashBounds(hash: string) {
  const alphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
  let south = -90,
    north = 90,
    west = -180,
    east = 180,
    lon = true;
  for (const char of hash) {
    const n = alphabet.indexOf(char);
    if (n < 0) return undefined;
    for (let bit = 4; bit >= 0; bit--) {
      if (lon) {
        const m = (west + east) / 2;
        if (n & (1 << bit)) west = m;
        else east = m;
      } else {
        const m = (south + north) / 2;
        if (n & (1 << bit)) south = m;
        else north = m;
      }
      lon = !lon;
    }
  }
  return { south, north, west, east };
}
export function Geography({ report, onSource }: { report: PairReport; onSource?: () => void }) {
  const heat = report.heatmap;
  if (!heat) return null;
  const cells = heat.cells
    .map((c) => ({ cell: c, bounds: geohashBounds(c.geohash) }))
    .filter(
      (c): c is { cell: HeatCell; bounds: NonNullable<ReturnType<typeof geohashBounds>> } =>
        !!c.bounds,
    );
  if (!cells.length) return <p>No geographic cells were returned for this request.</p>;
  const west = Math.min(...cells.map((c) => c.bounds.west)),
    east = Math.max(...cells.map((c) => c.bounds.east)),
    south = Math.min(...cells.map((c) => c.bounds.south)),
    north = Math.max(...cells.map((c) => c.bounds.north));
  const mid = (north + south) / 2,
    cos = Math.max(0.1, Math.cos((mid * Math.PI) / 180)),
    dx = (east - west) * cos,
    dy = north - south,
    scale = Math.min(640 / Math.max(dx, 0.001), 310 / Math.max(dy, 0.001));
  const x = (lon: number) => 30 + (640 - dx * scale) / 2 + (lon - west) * cos * scale,
    y = (lat: number) => 25 + (310 - dy * scale) / 2 + (north - lat) * scale;
  const places = report.activations.filter(
    (p) =>
      p.kind === 'place' &&
      p.lat !== undefined &&
      p.lon !== undefined &&
      p.lat >= south &&
      p.lat <= north &&
      p.lon >= west &&
      p.lon <= east,
  );
  return (
    <div className="pair-geography">
      <h4>Geographic context: {report.options.city}</h4>
      <p>
        Joint Qloo affinity rank. Darker cells indicate higher values. Pins are returned place
        suggestions.
      </p>
      <svg
        role="img"
        aria-label={`Geographic affinity cells for ${report.a.name} and ${report.b.name}`}
        viewBox="0 0 700 360"
      >
        <title>
          {report.options.city}: {cells.length} Qloo cells
        </title>
        <desc>
          Geographic cells and suggested places, without a street basemap. Latitude{' '}
          {south.toFixed(2)} to {north.toFixed(2)}; longitude {west.toFixed(2)} to {east.toFixed(2)}
          .
        </desc>
        {cells.map(({ cell: c, bounds: b }) => (
          <rect
            key={c.geohash}
            x={x(b.west)}
            y={y(b.north)}
            width={Math.max(0.2, (b.east - b.west) * cos * scale)}
            height={Math.max(0.2, (b.north - b.south) * scale)}
            fill="var(--audience-first)"
            opacity={0.08 + 0.82 * c.affinityRank}
          >
            <title>
              {c.geohash}: rank {c.affinityRank.toFixed(3)}, popularity{' '}
              {c.popularity?.toFixed(3) ?? 'not returned'}
            </title>
          </rect>
        ))}
        {places.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={x(p.lon!)}
              cy={y(p.lat!)}
              r="9"
              fill="var(--audience-second)"
              stroke="white"
              strokeWidth="2"
            />
            <text x={x(p.lon!)} y={y(p.lat!) + 3} textAnchor="middle" fill="white" fontSize="9">
              {i + 1}
            </text>
            <title>{p.name}</title>
          </g>
        ))}
      </svg>
      <div className="pair-map-legend">
        <span>Lower rank</span>
        <span className="pair-map-ramp" />
        <span>Higher rank</span>
      </div>
      <p className="pair-small">
        {cells.length} cells; {south.toFixed(2)}° to {north.toFixed(2)}° latitude, {west.toFixed(2)}
        ° to {east.toFixed(2)}° longitude. Qloo’s returned boundary may extend beyond the named
        city. Sparse or absent cells indicate coverage gaps.
      </p>
      <ol>
        {places.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ol>
      <p className="pair-small">
        Geographic affinity suggests areas to investigate; feasibility and venue availability still
        need checking.{' '}
        <a onClick={onSource} href={`#${report.id}-${heat.queryId}`}>
          Source {heat.queryId}
        </a>
      </p>
    </div>
  );
}
