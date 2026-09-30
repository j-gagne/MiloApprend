export function SleepingEyes({ left = [179, 97], right = [231, 93], color = '#3f4643' }: {
  left?: readonly [number, number]; right?: readonly [number, number] | null; color?: string;
}) {
  return <g data-sleeping-eyes="true" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
    <path d={`M${left[0] - 9} ${left[1]}q9 9 18 0`} />
    {right && <path d={`M${right[0] - 9} ${right[1]}q9 9 18 0`} />}
  </g>;
}
