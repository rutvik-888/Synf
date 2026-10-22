type Props = { className?: string; inverted?: boolean };

export function SynfMark({ className = 'h-9 w-9' }: Props) {
  return <img src="/synf-logo.svg" alt="SYNF TEAM" className={className} />;
}
