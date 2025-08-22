import { useEffect, useState } from "react";
import { Stack, Text } from "@mantine/core";

interface Props {
  progress: number;
  eta?: string;
}

export default function GoalEtaRing({ progress, eta }: Props) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress ?? 0));
    const timer = setTimeout(() => setP(clamped), 0);
    return () => clearTimeout(timer);
  }, [progress]);

  const size = 72;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - p);

  return (
    <Stack align="center" gap={2} style={{ minWidth: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeOpacity={0.15}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          stroke="currentColor"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
          strokeLinecap="round"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="14"
          fontWeight={700}
        >
          {Math.round(p * 100)}%
        </text>
      </svg>
      <Text size="xs" c="dimmed">
        {eta || "—"}
      </Text>
    </Stack>
  );
}
