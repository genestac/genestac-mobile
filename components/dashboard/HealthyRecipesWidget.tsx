import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RecipeRecommendation } from "@/lib/api";

interface HealthyRecipesWidgetProps {
  recipes: RecipeRecommendation[];
}

export const HealthyRecipesWidget: React.FC<HealthyRecipesWidgetProps> = ({
  recipes,
}) => {
  return (
    <View style={styles.trackerCardWidget}>
      <View style={styles.widgetHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="flash-outline" size={16} color="#EA580C" />
          <Text style={styles.widgetHeaderTitle}>Personalized Recipe Ideas</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginTop: 4 }}
      >
        {recipes.map((r, idx) => (
          <View key={idx} style={styles.recipeCardBox}>
            <View style={styles.recipeBadgeRow}>
              <View style={styles.orangeKcalBadge}>
                <Text style={styles.orangeKcalText}>{r.calories} kcal</Text>
              </View>
              <Text style={styles.recipeTimeText}>{r.prepTime}</Text>
            </View>
            <Text style={styles.recipeCardName}>{r.name}</Text>
            <Text style={styles.recipeCardDesc}>{r.benefits}</Text>
            <Text style={styles.recipeIngTitle}>Ingredients:</Text>
            {Array.isArray(r.ingredients) &&
              r.ingredients.slice(0, 3).map((ing, i) => (
                <Text key={i} style={styles.recipeIngItem}>
                  • {ing}
                </Text>
              ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  trackerCardWidget: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  widgetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  widgetHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  recipeCardBox: {
    width: 160,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  recipeBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orangeKcalBadge: {
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orangeKcalText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EA580C",
  },
  recipeTimeText: {
    fontSize: 10,
    color: "#64748B",
  },
  recipeCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  recipeCardDesc: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  recipeIngTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  recipeIngItem: {
    fontSize: 10,
    color: "#64748B",
  },
});

export default HealthyRecipesWidget;
