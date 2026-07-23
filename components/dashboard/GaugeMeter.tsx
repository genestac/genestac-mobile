import React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Line, Circle } from "react-native-svg";

interface GaugeMeterProps {
  value?: number;
  maxVal?: number;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value = 0.7,
  maxVal = 2.0,
}) => {
  const pct = Math.min(1, Math.max(0.05, value / maxVal));
  const cx = 90;
  const cy = 80;
  const R = 60;
  const strokeW = 16;

  const angleRad = (1 - pct) * Math.PI;
  const gx = cx + R * Math.cos(angleRad);
  const gy = cy - R * Math.sin(angleRad);

  const largeArcFlag = pct > 0.5 ? 1 : 0;

  const needleL = 40;
  const nx = cx + needleL * Math.cos(angleRad);
  const ny = cy - needleL * Math.sin(angleRad);

  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 8 }}>
      <Svg width={180} height={95} viewBox="0 0 180 95">
        {/* Background Arc (Muted Gray) */}
        <Path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Active Arc (Emerald Green) */}
        <Path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 ${largeArcFlag} 1 ${gx} ${gy}`}
          fill="none"
          stroke="#10B981"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Dark Navy Needle */}
        <Line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#1E293B"
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* Needle Base Circle */}
        <Circle cx={cx} cy={cy} r={5} fill="#1E293B" />
      </Svg>

      {/* Value Overlay Centered Under Needle */}
      <Text style={{ fontSize: 17, fontWeight: "800", color: "#1E293B", marginTop: -6 }}>
        {value} <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}>kg/wk</Text>
      </Text>
    </View>
  );
};

export default GaugeMeter;
