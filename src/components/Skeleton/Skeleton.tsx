import styles from './Skeleton.module.scss';

type Variant = 'text' | 'statCard' | 'tableRow' | 'chart';

interface SkeletonProps {
  variant: Variant;
  count?: number;
  width?: string;
}

// Skeleton shape resembles the actual content — no fullscreen spinner or blank page allowed (§8.10).
export default function Skeleton({ variant, count = 1, width }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={[styles.block, styles[variant]].join(' ')} style={width ? { width } : undefined} />
      ))}
    </>
  );
}

export function SkeletonStatCardRow({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '1.2rem' }}>
      <Skeleton variant="statCard" count={count} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <Skeleton variant="tableRow" count={rows} />
    </div>
  );
}
