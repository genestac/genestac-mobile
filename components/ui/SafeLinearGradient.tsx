import React from 'react';
import { View, ViewProps, ViewStyle, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';

interface SafeLinearGradientProps extends ViewProps {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function SafeLinearGradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
  children,
  ...props
}: SafeLinearGradientProps) {
  const gradientId = React.useId ? React.useId() : 'svg-gradient-bg';
  const validColors = colors && colors.length > 0 ? colors : ['#000', '#fff'];

  return (
    <View style={[{ position: 'relative', overflow: 'hidden' }, style]} {...props}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient
            id={gradientId}
            x1={`${start.x * 100}%`}
            y1={`${start.y * 100}%`}
            x2={`${end.x * 100}%`}
            y2={`${end.y * 100}%`}
          >
            {validColors.map((col, idx) => (
              <Stop
                key={idx}
                offset={`${(idx / Math.max(validColors.length - 1, 1)) * 100}%`}
                stopColor={col}
              />
            ))}
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      {children}
    </View>
  );
}
