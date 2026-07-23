import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Radius } from "@/constants/colors";
import { WeightLog } from "@/lib/types";

interface WeightLossChartProps {
  chartData: WeightLog[];
  range: string;
  setRange: (range: string) => void;
  DAYS: string[];
  mainChartWidth: number;
  minWeightBound: number;
  maxWeightBound: number;
  chartSegments: number;
  formatDateShort: (dateStr: string) => string;
}

export const WeightLossChart: React.FC<WeightLossChartProps> = ({
  chartData,
  range,
  setRange,
  DAYS,
  mainChartWidth,
  minWeightBound,
  maxWeightBound,
  chartSegments,
  formatDateShort,
}) => {
  return (
    <View style={styles.chartMainCard}>
      <View style={styles.chartTitleHeader}>
        <Text style={styles.cardHeaderTitle}>Weight Loss Graph</Text>
        <View style={styles.rangePillsRow}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.rangePillBtn,
                range === d && styles.rangePillBtnActive,
              ]}
              onPress={() => setRange(d)}
            >
              <Text
                style={[
                  styles.rangePillText,
                  range === d && styles.rangePillTextActive,
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 8 }}
      >
        <LineChart
          data={{
            labels: chartData.map((e) => formatDateShort(e.date)),
            datasets: [
              {
                data: chartData.map((e) => e.weight),
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                strokeWidth: 2.5,
              },
              {
                data: chartData.map(() => minWeightBound),
                color: () => "rgba(0, 0, 0, 0)",
                strokeWidth: 0,
                withDots: false,
              },
              {
                data: chartData.map(() => maxWeightBound),
                color: () => "rgba(250, 247, 247, 0)",
                strokeWidth: 0,
                withDots: false,
              },
            ],
          }}
          width={mainChartWidth}
          height={290}
          yAxisSuffix=" kg"
          segments={chartSegments}
          fromZero={false}
          withShadow={true}
          chartConfig={{
            backgroundColor: "#FFFFFF",
            backgroundGradientFrom: "#FFFFFF",
            backgroundGradientTo: "#FFFFFF",
            useShadowColorFromDataset: true,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: () => "#64748B",
            fillShadowGradientFrom: "#3B82F6",
            fillShadowGradientFromOpacity: 0.35,
            fillShadowGradientTo: "#FFFFFF",
            fillShadowGradientToOpacity: 0.01,
            fillShadowGradientFromOffset: 0,
            fillShadowGradientToOffset: 1,
            propsForLabels: {
              fontSize: 10,
              fontWeight: "600",
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: "#2563EB",
              fill: "#FFFFFF",
            },
            propsForBackgroundLines: {
              strokeDasharray: "4 4",
              stroke: "#d9dee4ff",
            },
          }}
          bezier
          style={{
            borderRadius: Radius.md,
            paddingRight: 48,
            paddingTop: 12,
            marginVertical: 4,
          }}
          withInnerLines={true}
          withOuterLines={false}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  chartMainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chartTitleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  rangePillsRow: {
    flexDirection: "row",
    gap: 4,
    // backgroundColor: "#F1F5F9",
    padding: 2,
    borderRadius: 8,
  },
  rangePillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    
  },
  rangePillBtnActive: {
    backgroundColor: "#1E293B",
  },
  rangePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
  rangePillTextActive: {
    color: "#FFFFFF",
  },
});

export default WeightLossChart;
