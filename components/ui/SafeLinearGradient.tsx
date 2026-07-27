import React, { useMemo, useState } from 'react';
import { View, ViewProps, ViewStyle, StyleSheet, LayoutChangeEvent } from 'react-native';
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
  onLayout,
  ...props
}: SafeLinearGradientProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const gradientId = useMemo(
    () => 'gradient_' + Math.random().toString(36).substring(2, 9),
    []
  );

  const validColors = colors && colors.length > 0 ? colors : ['#0f8b9e', '#5cbf5a'];

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
    if (onLayout) {
      onLayout(e);
    }
  };

  return (
    <View
      style={[{ position: 'relative', overflow: 'hidden', backgroundColor: validColors[0] }, style]}
      onLayout={handleLayout}
      {...props}
    >
      {size && size.width > 0 && size.height > 0 && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          pointerEvents="none"
        >
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
          <Rect x="0" y="0" width={size.width} height={size.height} fill={`url(#${gradientId})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}
