const LEAF_POSITIONS: [number, number][] = [
  [44, 30], [30, 38], [58, 38], [22, 50], [44, 44], [66, 50],
  [34, 58], [54, 58], [44, 52], [18, 62], [70, 62], [26, 44],
  [62, 44], [44, 64], [38, 48]
];

export function KnowledgeTree({ level, size = 88 }: { level: number; size?: number }) {
  const leaves = Math.min(level * 3, 15);
  const showFruit = level >= 5;

  return (
    <svg viewBox="0 0 88 88" width={size} height={size}>
      <rect x="40" y="58" width="8" height="26" rx="2" fill="#B98247" />
      {level <= 1 ? (
        <circle cx="44" cy="60" r="7" fill="#4C9F6C" />
      ) : (
        <g>
          {LEAF_POSITIONS.slice(0, leaves).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="6" fill="#4C9F6C" opacity={0.92} />
          ))}
          {showFruit && (
            <>
              <circle cx="34" cy="46" r="3" fill="#E4A61A" />
              <circle cx="54" cy="52" r="3" fill="#E4572E" />
              <circle cx="44" cy="36" r="3" fill="#E4A61A" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}
