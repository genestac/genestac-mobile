import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { WeightLog } from '@/lib/types';

interface WeightLossProgressChartProps {
  chartData?: WeightLog[];
  timeFilter?: 'Today' | 'Week' | 'Month';
  weightRange?: string;
}

const screenWidth = Dimensions.get('window').width;

const formatDateLabel = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }
  }
  return dateStr;
};

export const WeightLossProgressChart: React.FC<WeightLossProgressChartProps> = ({
  chartData = [],
  timeFilter = 'Today',
  weightRange = '7D',
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Layout boundaries
  const cardPadding = 18;
  const availableCardWidth = Math.min(screenWidth - 32 - cardPadding * 2, 380);
  const leftLabelMargin = 32;
  const chartHeight = 175;
  const topMargin = 12;
  const bottomMargin = 28;
  const plotHeight = chartHeight - topMargin - bottomMargin;
  const baselineY = topMargin + plotHeight;
  const midGridY = topMargin + plotHeight / 2;
  const topGridY = topMargin;

  // Check if user has real weight logs
  const hasUserLogs = Array.isArray(chartData) && chartData.length > 0;

  // Process data points and dates
  const { minY, maxY, yLabels, points, isScrollable, totalChartWidth } = useMemo(() => {
    if (!hasUserLogs) {
      // Demo preview matching initial design when user has 0 logs
      let defaultDates = ['26 Sep', '29 Sep', '02 Oct', '05 Oct', '08 Oct'];
      if (weightRange === '30D') {
        defaultDates = ['10 Sep', '17 Sep', '24 Sep', '01 Oct', '08 Oct'];
      } else if (weightRange === '90D') {
        defaultDates = ['10 Jul', '30 Jul', '20 Aug', '10 Sep', '08 Oct'];
      } else if (weightRange === 'All') {
        defaultDates = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
      }

      const sampleWeights = [76.0, 74.8, 74.1, 73.3, 72.6, 72.1, 71.4, 71.3, 71.1];
      const staticWidth = availableCardWidth - leftLabelMargin;
      const step = staticWidth / (sampleWeights.length - 1);

      const demoPoints = sampleWeights.map((w, idx) => ({
        x: idx * step + 8,
        y: topMargin + ((78 - w) / (78 - 70)) * plotHeight,
        weight: w,
        dateLabel: defaultDates[Math.min(Math.floor(idx / 2), defaultDates.length - 1)],
        isAnchorDate: idx % 2 === 0 || idx === sampleWeights.length - 1,
      }));

      return {
        minY: 70,
        maxY: 78,
        yLabels: [78, 74, 70],
        points: demoPoints,
        isScrollable: false,
        totalChartWidth: staticWidth + 16,
      };
    }

    // ── REAL USER DATA: SHOW ALL LOGGED DATES ──
    // Deduplicate entries by calendar day (keep the latest entry for each day)
    const dayMap = new Map<string, WeightLog>();
    for (const item of chartData) {
      if (!item.date) continue;
      const cleanDay = item.date.split('T')[0];
      dayMap.set(cleanDay, item);
    }
    const uniqueList = Array.from(dayMap.values());

    const sorted = uniqueList.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const weights = sorted.map((d) => d.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);

    // Compute dynamic Y bounds
    const calcMinY = Math.floor(Math.min(minW - 0.5, 70));
    const calcMaxY = Math.ceil(Math.max(maxW + 0.5, calcMinY + 6));
    const midY = Math.round((calcMinY + calcMaxY) / 2);
    const calculatedYLabels = [calcMaxY, midY, calcMinY];

    const availablePlotWidth = availableCardWidth - leftLabelMargin;
    const paddingX = 26;
    const minSpacing = 56;
    const neededWidth = (sorted.length - 1) * minSpacing + paddingX * 2;
    const calculatedWidth = Math.max(availablePlotWidth, neededWidth);
    const scrollNeeded = calculatedWidth > availablePlotWidth;
    const plotSpan = calculatedWidth - paddingX * 2;

    const mappedPoints = sorted.map((item, idx) => {
      let x = paddingX;
      if (sorted.length === 1) {
        x = calculatedWidth / 2;
      } else {
        x = paddingX + (idx / (sorted.length - 1)) * plotSpan;
      }

      const diff = calcMaxY - calcMinY || 1;
      const y = topMargin + ((calcMaxY - item.weight) / diff) * plotHeight;

      return {
        x,
        y,
        weight: item.weight,
        dateLabel: formatDateLabel(item.date),
        isAnchorDate: true,
      };
    });

    return {
      minY: calcMinY,
      maxY: calcMaxY,
      yLabels: calculatedYLabels,
      points: mappedPoints,
      isScrollable: scrollNeeded,
      totalChartWidth: calculatedWidth,
    };
  }, [chartData, hasUserLogs, weightRange, availableCardWidth, plotHeight]);

  // Generate smooth cubic bezier curve
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: '', areaPath: '' };

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const areaD = `${d} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { linePath: d, areaPath: areaD };
  }, [points, baselineY]);

  // Auto-scroll to latest logged date when scrollable
  useEffect(() => {
    if (isScrollable && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isScrollable, points.length]);

  return (
    <View style={styles.chartWrapper}>
      {/* ── Fixed Left Y-Axis Scale ── */}
      <View style={[styles.yAxisColumn, { height: chartHeight }]}>
        <Text style={[styles.yAxisLabel, { top: topGridY - 7 }]}>{yLabels[0]}</Text>
        <Text style={[styles.yAxisLabel, { top: midGridY - 7 }]}>{yLabels[1]}</Text>
        <Text style={[styles.yAxisLabel, { top: baselineY - 7 }]}>{yLabels[2]}</Text>
      </View>

      {/* ── Chart Canvas Area (Horizontally scrollable if dates exceed screen) ── */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={isScrollable}
        style={{ height: chartHeight }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Svg width={totalChartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="progressAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
              <Stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Horizontal Grid Lines */}
          <Line
            x1="0"
            y1={topGridY}
            x2={totalChartWidth}
            y2={topGridY}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <Line
            x1="0"
            y1={midGridY}
            x2={totalChartWidth}
            y2={midGridY}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <Line
            x1="0"
            y1={baselineY}
            x2={totalChartWidth}
            y2={baselineY}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Vertical Grid Lines at Every Logged Date */}
          {points.map((pt, idx) => (
            <Line
              key={`vert-${idx}`}
              x1={pt.x}
              y1={topGridY}
              x2={pt.x}
              y2={baselineY}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area Fill */}
          {areaPath ? <Path d={areaPath} fill="url(#progressAreaGrad)" /> : null}

          {/* Teal Connecting Line */}
          {linePath ? (
            <Path
              d={linePath}
              stroke="#14B8A6"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Data Point Dots & Value Pills */}
          {points.map((pt, idx) => (
            <React.Fragment key={`pt-group-${idx}`}>
              <Circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#0D9488"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {/* Highlight weight value above the latest point or single point */}
              {(points.length === 1 || idx === points.length - 1) && (
                <SvgText
                  x={pt.x}
                  y={Math.max(pt.y - 8, topMargin + 2)}
                  fontSize="11"
                  fontWeight="700"
                  fill="#0D9488"
                  textAnchor="middle"
                >
                  {pt.weight} kg
                </SvgText>
              )}
            </React.Fragment>
          ))}

          {/* X-Axis Date Labels: Every Single Logged Date is Rendered */}
          {points.map((pt, idx) => {
            if (!pt.isAnchorDate) return null;
            return (
              <SvgText
                key={`lbl-${idx}`}
                x={pt.x}
                y={chartHeight - 6}
                fontSize="10"
                fontWeight="600"
                fill="#64748B"
                textAnchor="middle"
              >
                {pt.dateLabel}
              </SvgText>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 6,
  },
  yAxisColumn: {
    width: 28,
    position: 'relative',
    marginRight: 4,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default WeightLossProgressChart;
