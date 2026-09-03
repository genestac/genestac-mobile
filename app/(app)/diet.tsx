import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { supabase } from "@/lib/supabase";
import { fetchUserPlans, generateAIUserPlans, updateDoctorReviewStatus } from "@/lib/api";
import { HealthProfile } from "@/lib/types";
import { HealthProfileModal } from "@/components/HealthProfileModal";
import { UnderDoctorReviewCard } from "@/components/UnderDoctorReviewCard";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";
import { SafeLinearGradient as LinearGradient } from "@/components/ui/SafeLinearGradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width * 0.85, 360);
const CARD_GAP = 14;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface MealTheme {
  title: string;
  tagline: string;
  summaryText: string;
  defaultTime: string;
  bgGradient: [string, string];
  borderColor: string;
  accentColor: string;
  textColor: string;
  subtextColor: string;
  cardBg: string;
  pillBg: string;
  pillText: string;
  iconName: string;
  illustration: "sunrise" | "sun" | "sunset" | "night";
  defaultMacros: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
  doctorNote: string;
}

// Icons rotate per ingredient line instead of repeating the same checkmark everywhere.
const INGREDIENT_ICONS = [
  "leaf-outline",
  "flame-outline",
  "water-outline",
  "nutrition-outline",
  "checkmark-circle",
];

const MEAL_THEMES: Record<string, MealTheme> = {
  breakfast: {
    title: "Breakfast",
    tagline: "🌅 First fuel of the day",
    summaryText: "Properly balanced for steady energy & weight loss",
    defaultTime: "7:30 AM - 8:30 AM",
    bgGradient: ["#FFF7ED", "#FFEDD5"],
    borderColor: "#FDBA74",
    accentColor: "#EA580C",
    textColor: "#431407",
    subtextColor: "#9A3412",
    cardBg: "#FFFFFF",
    pillBg: "#FFEDD5",
    pillText: "#C2410C",
    iconName: "sunny",
    illustration: "sunrise",
    defaultMacros: {
      calories: "420 kcal",
      protein: "18g",
      carbs: "48g",
      fat: "12g",
    },
    doctorNote:
      "Portioned to keep you full till lunch without a mid-morning crash.",
  },
  lunch: {
    title: "Lunch",
    tagline: "☀️ Midday reset",
    summaryText: "Ideal balance of protein, carbs, and healthy fats",
    defaultTime: "1:00 PM - 2:00 PM",
    bgGradient: ["#FEF3C7", "#FDE68A"],
    borderColor: "#FCD34D",
    accentColor: "#D97706",
    textColor: "#451A03",
    subtextColor: "#92400E",
    cardBg: "#FFFFFF",
    pillBg: "#FEF3C7",
    pillText: "#B45309",
    iconName: "sunny",
    illustration: "sun",
    defaultMacros: {
      calories: "580 kcal",
      protein: "36g",
      carbs: "54g",
      fat: "16g",
    },
    doctorNote:
      "Balanced enough to skip the 3pm slump — steady energy, no sugar spike.",
  },
  snacks: {
    title: "Evening Snack",
    tagline: "🌇 A small bridge to dinner",
    summaryText: "Measured portions designed for your daily goals",
    defaultTime: "4:30 PM - 5:30 PM",
    bgGradient: ["#FFF1F2", "#FFE4E6"],
    borderColor: "#FECDD3",
    accentColor: "#E11D48",
    textColor: "#4C0519",
    subtextColor: "#9F1239",
    cardBg: "#FFFFFF",
    pillBg: "#FFE4E6",
    pillText: "#BE123C",
    iconName: "partly-sunny",
    illustration: "sunset",
    defaultMacros: {
      calories: "210 kcal",
      protein: "10g",
      carbs: "24g",
      fat: "6g",
    },
    doctorNote:
      "Light enough to curb hunger without dulling your appetite for dinner.",
  },
  dinner: {
    title: "Dinner",
    tagline: "🌙 Wind down, don't wind up",
    summaryText: "Balanced meal designed by your nutritionist",
    defaultTime: "7:30 PM - 8:30 PM",
    bgGradient: ["#0F172A", "#1E293B"],
    borderColor: "#334155",
    accentColor: "#38BDF8",
    textColor: "#F8FAFC",
    subtextColor: "#94A3B8",
    cardBg: "#1E293B",
    pillBg: "#334155",
    pillText: "#38BDF8",
    iconName: "moon",
    illustration: "night",
    defaultMacros: {
      calories: "390 kcal",
      protein: "28g",
      carbs: "26g",
      fat: "10g",
    },
    doctorNote:
      "Warm, easy to digest, and timed so it doesn't fight with your sleep.",
  },
};

interface FormattedMeal {
  title: string;
  subtitle?: string;
  details?: string[];
  calories?: string;
}

interface ParsedMeal extends FormattedMeal {
  id: string;
  typeLabel: string;
  theme: MealTheme;
}

function formatMealItem(data: any): FormattedMeal {
  if (data === null || data === undefined) {
    return { title: "Balanced Meal" };
  }

  if (
    typeof data === "string" ||
    typeof data === "number" ||
    typeof data === "boolean"
  ) {
    return { title: String(data) };
  }

  if (Array.isArray(data)) {
    const items = data
      .map((item) =>
        typeof item === "object" && item !== null
          ? formatMealItem(item).title
          : String(item),
      )
      .filter(Boolean);
    return {
      title: items[0] || "Nutritious Meal Options",
      details: items.length > 1 ? items.slice(1) : undefined,
    };
  }

  if (typeof data === "object") {
    const titleCandidates = [
      data.meal,
      data.name,
      data.title,
      data.dish,
      data.food,
      data.meal_name,
      data.item,
      data.description,
      data.text,
    ];
    let titleStr: string | undefined;

    for (const cand of titleCandidates) {
      if (cand && typeof cand === "string") {
        titleStr = cand;
        break;
      } else if (cand && typeof cand === "number") {
        titleStr = String(cand);
        break;
      } else if (cand && typeof cand === "object") {
        const nested = formatMealItem(cand);
        titleStr = nested.title;
        break;
      }
    }

    let caloriesStr: string | undefined;
    if (data.calories || data.kcal || data.cals) {
      const c = data.calories || data.kcal || data.cals;
      caloriesStr = typeof c === "number" ? `${c} kcal` : String(c);
    }

    const subCandidates = [
      data.portion,
      data.quantity,
      data.servings,
      data.description,
      data.notes,
      data.summary,
    ];
    let subtitleStr: string | undefined;
    for (const sub of subCandidates) {
      if (sub && typeof sub === "string" && sub !== titleStr) {
        subtitleStr = sub;
        break;
      }
    }

    let details: string[] | undefined;
    const arrayCandidates = [
      data.items,
      data.ingredients,
      data.foods,
      data.components,
    ];
    for (const arr of arrayCandidates) {
      if (Array.isArray(arr) && arr.length > 0) {
        details = arr.map((i) =>
          typeof i === "object" && i !== null
            ? i.name || i.title || JSON.stringify(i)
            : String(i),
        );
        break;
      }
    }

    if (!titleStr) {
      const entries = Object.entries(data)
        .filter(
          ([k, v]) => v !== null && v !== undefined && typeof v !== "function",
        )
        .map(([k, v]) => {
          const valStr = typeof v === "object" ? JSON.stringify(v) : String(v);
          const formattedKey = k
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          return `${formattedKey}: ${valStr}`;
        });

      if (entries.length > 0) {
        titleStr = entries[0];
        if (entries.length > 1 && !details) {
          details = entries.slice(1);
        }
      } else {
        titleStr = "Healthy Chef Preparation";
      }
    }

    return {
      title: titleStr,
      subtitle: subtitleStr,
      details,
      calories: caloriesStr,
    };
  }

  return { title: String(data) };
}

function getDayPlan(plan: any, day: string): any {
  if (!plan || typeof plan !== "object") return null;
  const dayLower = day.toLowerCase();
  const dayShort = dayLower.slice(0, 3);

  for (const key of Object.keys(plan)) {
    const k = key.toLowerCase();
    if (k === dayLower || k === dayShort) {
      return plan[key];
    }
  }

  const keys = Object.keys(plan).map((k) => k.toLowerCase());
  const hasMealKeys = keys.some((k) =>
    ["breakfast", "lunch", "snacks", "snack", "dinner", "meals"].includes(k),
  );
  if (hasMealKeys) {
    return plan;
  }

  return null;
}

function parseMeals(dayData: any): ParsedMeal[] {
  const mealKeysOrder = ["breakfast", "lunch", "snacks", "dinner"];
  const parsed: ParsedMeal[] = [];

  if (dayData && typeof dayData === "object" && !Array.isArray(dayData)) {
    for (const key of mealKeysOrder) {
      let rawMeal =
        dayData[key] ||
        dayData[key.slice(0, 5)] ||
        dayData[key.charAt(0).toUpperCase() + key.slice(1)];
      if (!rawMeal && key === "snacks") {
        rawMeal =
          dayData["snack"] || dayData["Snack"] || dayData["evening_snack"];
      }

      const theme = MEAL_THEMES[key];
      if (rawMeal) {
        const formatted = formatMealItem(rawMeal);
        parsed.push({
          id: key,
          typeLabel: theme.title,
          title: formatted.title,
          subtitle: formatted.subtitle,
          details: formatted.details,
          calories: formatted.calories,
          theme,
        });
      } else {
        parsed.push(getDefaultMealForType(key, theme));
      }
    }
    return parsed;
  }

  if (Array.isArray(dayData)) {
    return mealKeysOrder.map((key, index) => {
      const theme = MEAL_THEMES[key];
      const item = dayData[index];
      if (item) {
        const formatted = formatMealItem(item);
        return {
          id: key,
          typeLabel: theme.title,
          title: formatted.title,
          subtitle: formatted.subtitle,
          details: formatted.details,
          calories: formatted.calories,
          theme,
        };
      }
      return getDefaultMealForType(key, theme);
    });
  }

  return mealKeysOrder.map((key) =>
    getDefaultMealForType(key, MEAL_THEMES[key]),
  );
}

function getDefaultMealForType(key: string, theme: MealTheme): ParsedMeal {
  const defaults: Record<
    string,
    { title: string; subtitle: string; details: string[] }
  > = {
    breakfast: {
      title: "Avocado & Egg Toast with Fresh Berries",
      subtitle:
        "2 organic eggs, whole grain bread, wild blueberries & chia seeds",
      details: [
        "Poached eggs, cracked black pepper on top",
        "Sourdough toast, brushed with olive oil",
        "Small handful of berries and a green tea",
      ],
    },
    lunch: {
      title: "Grilled Herb Chicken & Quinoa Bowl",
      subtitle:
        "Lean chicken breast, roasted vegetables, lemon-tahini dressing",
      details: [
        "Herb-marinated grilled chicken breast",
        "Steamed quinoa with roasted sweet potato",
        "Kale, cucumber and a flaxseed crunch",
      ],
    },
    snacks: {
      title: "Roasted Almonds & Green Tea",
      subtitle: "A handful of raw almonds, apple slices, cinnamon",
      details: [
        "12-15 raw unsalted almonds",
        "One apple, sliced",
        "Warm green tea or chamomile",
      ],
    },
    dinner: {
      title: "Pan-Seared Salmon with Asparagus & Broth",
      subtitle: "Wild salmon, garlic asparagus, light lentil broth",
      details: [
        "Pan-seared salmon fillet",
        "Sautéed asparagus, sea salt and garlic",
        "Small bowl of light herb broth",
      ],
    },
  };

  const def = defaults[key] || defaults.breakfast;
  return {
    id: key,
    typeLabel: theme.title,
    title: def.title,
    subtitle: def.subtitle,
    details: def.details,
    calories: theme.defaultMacros.calories,
    theme,
  };
}

/**
 * Live progress against the meal's time window — this is what makes the
 * card feel connected to "right now" instead of a frozen static screenshot.
 */
function useMealWindowProgress(timeRange: string) {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<"upcoming" | "active" | "past">(
    "upcoming",
  );

  useEffect(() => {
    const parseTime = (t: string) => {
      const [time, period] = t.trim().split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };

    const update = () => {
      const [startStr, endStr] = timeRange.split(" - ");
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const start = parseTime(startStr);
      const end = parseTime(endStr);

      if (nowMins < start) {
        const diff = start - nowMins;
        setLabel(
          diff > 60
            ? `Starts in ${Math.round(diff / 60)}h`
            : `Starts in ${diff}m`,
        );
        setProgress(0);
        setStatus("upcoming");
      } else if (nowMins > end) {
        setLabel("Window closed");
        setProgress(1);
        setStatus("past");
      } else {
        setProgress(
          Math.min(1, Math.max(0, (nowMins - start) / (end - start))),
        );
        setLabel(`${end - nowMins} min left`);
        setStatus("active");
      }
    };

    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [timeRange]);

  return { progress, label, status };
}

/**
 * Small helper that gives any pressable a subtle scale-down on tap,
 * instead of the flat opacity change TouchableOpacity gives by default.
 */
function PressableScale({
  children,
  onPress,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Thematic illustration header — off-center sun/moon, a cropped horizon,
 * and scattered grain dots for texture, so it reads less like a centered
 * clip-art sticker and more like a deliberately composed scene.
 */
function MealHeaderIllustration({
  type,
}: {
  type: "sunrise" | "sun" | "sunset" | "night";
}) {
  const grain = (seedOffset: number, color: string) =>
    [...Array(14)].map((_, i) => (
      <Circle
        key={i}
        cx={20 + ((i * 137 + seedOffset) % 280)}
        cy={8 + ((i * 53 + seedOffset) % 55)}
        r={0.8 + (i % 3) * 0.4}
        fill={color}
        opacity={0.12 + (i % 4) * 0.05}
      />
    ));

  if (type === "sunrise") {
    return (
      <Svg width="100%" height={90} viewBox="0 0 300 90">
        <Defs>
          <SvgGradient id="sunriseGrad" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#FED7AA" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFF7ED" stopOpacity={0.1} />
          </SvgGradient>
          <SvgGradient id="sunOrbA" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFD980" />
            <Stop offset="1" stopColor="#F97316" />
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="90" fill="url(#sunriseGrad)" />
        <Path
          d="M0 68 Q80 58 160 66 T300 58 L300 90 L0 90 Z"
          fill="#FDBA74"
          opacity={0.3}
        />
        <Circle cx="222" cy="80" r="36" fill="url(#sunOrbA)" opacity={0.92} />
        <Path
          d="M222 32 L224 20 M190 46 L181 38 M254 46 L263 38"
          stroke="#EA580C"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.45}
        />
        <Path
          d="M50 30 Q55 25 60 30 Q65 25 70 30"
          stroke="#EA580C"
          strokeWidth="1.6"
          fill="none"
          opacity={0.5}
        />
        {grain(0, "#FDBA74")}
      </Svg>
    );
  }

  if (type === "sun") {
    return (
      <Svg width="100%" height={90} viewBox="0 0 300 90">
        <Defs>
          <SvgGradient id="sunGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FEF3C7" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#FDE68A" stopOpacity={0.55} />
          </SvgGradient>
          <SvgGradient id="sunOrbB" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FEF08A" />
            <Stop offset="1" stopColor="#F59E0B" />
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="90" fill="url(#sunGrad)" />
        <Circle cx="90" cy="38" r="28" fill="#F59E0B" opacity={0.18} />
        <Circle cx="90" cy="38" r="20" fill="url(#sunOrbB)" />
        <Path
          d="M90 6 L90 -2 M90 70 L90 78 M55 38 L47 38 M56 20 L50 14 M124 56 L130 62 M56 56 L50 62 M124 20 L130 14"
          stroke="#D97706"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.5}
        />
        {grain(40, "#FCD34D")}
      </Svg>
    );
  }

  if (type === "sunset") {
    return (
      <Svg width="100%" height={90} viewBox="0 0 300 90">
        <Defs>
          <SvgGradient id="sunsetGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF1F2" stopOpacity={0.2} />
            <Stop offset="1" stopColor="#FECDD3" stopOpacity={0.55} />
          </SvgGradient>
          <SvgGradient id="sunOrbC" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FBBF24" />
            <Stop offset="1" stopColor="#F43F5E" />
          </SvgGradient>
        </Defs>
        <Rect width="100%" height="90" fill="url(#sunsetGrad)" />
        {/* <Path
          d="M0 62 L300 66"
          stroke="#FB7185"
          strokeWidth="1.5"
          opacity={0.35}
        /> */}
        <Circle cx="70" cy="70" r="30" fill="url(#sunOrbC)" opacity={0.88} />
        <Path
          d="M170 26 Q174 22 178 26 Q182 22 186 26"
          stroke="#BE123C"
          strokeWidth="1.6"
          fill="none"
          opacity={0.55}
        />
        <Path
          d="M200 18 Q204 14 208 18 Q212 14 216 18"
          stroke="#BE123C"
          strokeWidth="1.4"
          fill="none"
          opacity={0.5}
        />
        {grain(80, "#FECDD3")}
      </Svg>
    );
  }

  return (
    <Svg width="100%" height={90} viewBox="0 0 300 90">
      <Defs>
        <SvgGradient id="nightGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0F172A" />
          <Stop offset="1" stopColor="#1E293B" />
        </SvgGradient>
      </Defs>
      <Rect width="100%" height="90" fill="url(#nightGrad)" />
      <Path
        d="M235 14 A 17 17 0 1 0 250 40 A 13 13 0 1 1 235 14 Z"
        fill="#FDE047"
        opacity={0.92}
      />
      <Circle cx="55" cy="22" r="1.6" fill="#38BDF8" opacity={0.85} />
      <Circle cx="85" cy="52" r="1.3" fill="#FFFFFF" opacity={0.65} />
      <Circle cx="115" cy="18" r="2" fill="#FDE047" opacity={0.8} />
      <Circle cx="150" cy="42" r="1.4" fill="#38BDF8" opacity={0.7} />
      <Circle cx="175" cy="16" r="1.5" fill="#FFFFFF" opacity={0.75} />
      <Circle cx="30" cy="45" r="1.2" fill="#38BDF8" opacity={0.6} />
      {grain(120, "#334155")}
    </Svg>
  );
}

function MealCardItem({ meal }: { meal: ParsedMeal }) {
  const { theme } = meal;
  const isNight = meal.id === "dinner";
  const { progress, label, status } = useMealWindowProgress(theme.defaultTime);

  return (
    <View
      key={meal.id}
      style={[
        s.mealCard,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          shadowColor: theme.accentColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
        },
      ]}
    >
      {/* Thematic Artwork Header */}
      <View style={s.illustrationWrap}>
        <MealHeaderIllustration type={theme.illustration} />
        <View style={s.illustrationOverlay}>
          <View style={[s.mealBadge, { backgroundColor: theme.pillBg }]}>
            <Ionicons
              name={theme.iconName as any}
              size={16}
              color={theme.pillText}
            />
            <Text style={[s.mealBadgeText, { color: theme.pillText }]}>
              {theme.title.toUpperCase()}
            </Text>
          </View>

          <View
            style={[
              s.timePill,
              {
                backgroundColor: isNight ? "#334155" : "rgba(255,255,255,0.9)",
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={13}
              color={isNight ? "#38BDF8" : theme.accentColor}
            />
            <Text
              style={[
                s.timePillText,
                { color: isNight ? "#38BDF8" : theme.accentColor },
              ]}
            >
              {theme.defaultTime}
            </Text>
          </View>
        </View>
      </View>

      {/* Live meal-window progress bar */}
      <View style={s.windowRow}>
        <View
          style={[
            s.windowBarTrack,
            { backgroundColor: isNight ? "#334155" : theme.bgGradient[0] },
          ]}
        >
          <View
            style={[
              s.windowBarFill,
              {
                width: `${Math.max(4, progress * 100)}%`,
                backgroundColor:
                  status === "past"
                    ? isNight
                      ? "#475569"
                      : "#D1D5DB"
                    : theme.accentColor,
              },
            ]}
          />
        </View>
        <Text
          style={[
            s.windowLabel,
            {
              color:
                status === "active" ? theme.accentColor : theme.subtextColor,
            },
          ]}
        >
          {label}
        </Text>
      </View>

      {/* Meal Title & Tagline */}
      <View style={s.cardBody}>
        <Text style={[s.taglineText, { color: theme.subtextColor }]}>
          {theme.tagline}
        </Text>

        <Text style={[s.mealTitleText, { color: theme.textColor }]}>
          {meal.title}
        </Text>

        {meal.subtitle ? (
          <Text
            style={[
              s.mealSubtitleText,
              { color: isNight ? "#94A3B8" : Colors.textSecondary },
            ]}
          >
            {meal.subtitle}
          </Text>
        ) : null}

        {/* Macros Grid */}
        <View
          style={[
            s.macrosGrid,
            {
              backgroundColor: isNight ? "#0F172A" : theme.bgGradient[0],
              borderColor: theme.borderColor,
            },
          ]}
        >
          <View style={s.macroItem}>
            <Text style={[s.macroValue, { color: theme.accentColor }]}>
              {meal.calories || theme.defaultMacros.calories}
            </Text>
            <Text
              style={[
                s.macroLabel,
                { color: isNight ? "#CBD5E1" : Colors.textMuted },
              ]}
            >
              Energy
            </Text>
          </View>

          <View style={s.macroDivider} />

          <View style={s.macroItem}>
            <Text style={[s.macroValue, { color: theme.accentColor }]}>
              {theme.defaultMacros.protein}
            </Text>
            <Text
              style={[
                s.macroLabel,
                { color: isNight ? "#CBD5E1" : Colors.textMuted },
              ]}
            >
              Protein
            </Text>
          </View>

          <View style={s.macroDivider} />

          <View style={s.macroItem}>
            <Text style={[s.macroValue, { color: theme.accentColor }]}>
              {theme.defaultMacros.carbs}
            </Text>
            <Text
              style={[
                s.macroLabel,
                { color: isNight ? "#CBD5E1" : Colors.textMuted },
              ]}
            >
              Carbs
            </Text>
          </View>

          <View style={s.macroDivider} />

          <View style={s.macroItem}>
            <Text style={[s.macroValue, { color: theme.accentColor }]}>
              {theme.defaultMacros.fat}
            </Text>
            <Text
              style={[
                s.macroLabel,
                { color: isNight ? "#CBD5E1" : Colors.textMuted },
              ]}
            >
              Fats
            </Text>
          </View>
        </View>

        {/* Ingredients / Prep List */}
        <View style={s.itemsSection}>
          <Text style={[s.sectionHeading, { color: theme.textColor }]}>
            Included Ingredients & Prep:
          </Text>

          {meal.details && meal.details.length > 0 ? (
            meal.details.map((item, idx) => (
              <View key={idx} style={s.ingredientRow}>
                <Ionicons
                  name={INGREDIENT_ICONS[idx % INGREDIENT_ICONS.length] as any}
                  size={16}
                  color={theme.accentColor}
                />
                <Text
                  style={[
                    s.ingredientText,
                    { color: isNight ? "#E2E8F0" : Colors.textPrimary },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))
          ) : (
            <View style={s.ingredientRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={theme.accentColor}
              />
              <Text
                style={[
                  s.ingredientText,
                  { color: isNight ? "#E2E8F0" : Colors.textPrimary },
                ]}
              >
                {theme.summaryText}
              </Text>
            </View>
          )}
        </View>

        {/* Doctor / Nutritionist Guidance Box */}
        <View
          style={[
            s.doctorBox,
            {
              backgroundColor: isNight ? "#0F172A" : theme.bgGradient[1],
              borderColor: theme.borderColor,
            },
          ]}
        >
          <Ionicons
            name="medical-outline"
            size={18}
            color={theme.accentColor}
          />
          <Text
            style={[
              s.doctorNoteText,
              { color: isNight ? "#E2E8F0" : theme.subtextColor },
            ]}
          >
            {theme.doctorNote}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DietScreen() {

  const [dietPlan, setDietPlan] = useState<any>(null);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [doctorReview, setDoctorReview] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const [selectedDay, setSelectedDay] = useState(today);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  const fetchPlan = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setError("Not logged in");
      setLoading(false);
      return;
    }
    setUserId(session.user.id);

    const userPlan = await fetchUserPlans(session.user.id);
    if (userPlan) {
      setDietPlan(userPlan.diet_plan || null);
      setHealthProfile(userPlan.health_profile || null);
      setDoctorReview(userPlan.doctor_review ?? null);

      if (!userPlan.health_profile || Object.keys(userPlan.health_profile).length === 0) {
        setShowProfileModal(true);
      }
    } else {
      setShowProfileModal(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleProfileSubmit = async (profile: HealthProfile) => {
    if (!userId) return;
    setGeneratingPlan(true);
    try {
      const generated = await generateAIUserPlans(userId, profile);
      setHealthProfile(profile);
      setDoctorReview(false);
      if (generated?.diet_plan) {
        setDietPlan(generated.diet_plan);
      }
      setShowProfileModal(false);
    } catch (err) {
      console.error("Error submitting health profile:", err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleApproveDemo = async () => {
    if (!userId) return;
    setApproving(true);
    try {
      await updateDoctorReviewStatus(userId, true);
      setDoctorReview(true);
    } catch (err) {
      console.error("Failed to approve plan:", err);
    } finally {
      setApproving(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index >= 0 && index < 4 && index !== activeCardIndex) {
      setActiveCardIndex(index);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center} edges={["top", "left", "right"]}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
      </SafeAreaView>
    );
  }

  const todayPlan = dietPlan?.[selectedDay] || dietPlan;
  const meals = Array.isArray(todayPlan) ? todayPlan : [];

  return (
    <SafeAreaView style={s.flex} edges={["top", "left", "right"]}>
      <HealthProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSubmit={handleProfileSubmit}
        loading={generatingPlan}
      />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIconRing}>
            <View style={s.headerIcon}>
              <Ionicons name="restaurant" size={20} color={Colors.white} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={s.title}>Diet Plan</Text>
              {doctorReview === true ? (
                <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#059669" }}>DOCTOR APPROVED</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#D97706" }}>PENDING REVIEW</Text>
                </View>
              )}
            </View>
            <Text style={s.subtitle}>
              {doctorReview === true
                ? "Custom 7-day meal schedule reviewed by your care team"
                : "Under doctor review for clinical safety"}
            </Text>
          </View>
        </View>

        {/* If Doctor Review is Pending */}
        {doctorReview !== true ? (
          <UnderDoctorReviewCard
            healthProfile={healthProfile || undefined}
            onEditProfile={() => setShowProfileModal(true)}
          />
        ) : (
          <>
            {/* Day Selector */}
            {dietPlan && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.dayScroll}
              >
                {DAYS.map((d) => {
                  const active = selectedDay === d;
                  const isToday = d === today;
                  return (
                    <PressableScale
                      key={d}
                      style={[s.dayBtn, active && s.dayBtnActive]}
                      onPress={() => {
                        setSelectedDay(d);
                        setActiveCardIndex(0);
                        scrollRef.current?.scrollTo({ x: 0, animated: true });
                      }}
                    >
                      <Text style={[s.dayBtnText, active && s.dayBtnTextActive]}>
                        {d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)}
                      </Text>
                      {isToday && (
                        <View
                          style={[
                            s.todayDot,
                            active && { backgroundColor: Colors.white },
                          ]}
                        />
                      )}
                    </PressableScale>
                  );
                })}
              </ScrollView>
            )}

            {/* Meals Carousel Section */}
            {error && !dietPlan ? (
              <View style={s.emptyState}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="leaf-outline" size={40} color={Colors.primary} />
                </View>
                <Text style={s.emptyTitle}>No Custom Diet Plan</Text>
                <Text style={s.emptyText}>{error}</Text>
              </View>
            ) : (
              <View style={s.carouselWrapper}>
                {/* Horizontal Carousel */}
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  pagingEnabled={false}
                  snapToInterval={CARD_WIDTH + CARD_GAP}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={s.carouselContent}
                >
                  {meals.map((meal) => (
                    <MealCardItem key={meal.id} meal={meal} />
                  ))}
                </ScrollView>

                {/* Pagination Dots Indicator */}
                <View style={s.dotsWrapper}>
                  {meals.map((m, idx) => (
                    <PressableScale
                      key={m.id}
                      onPress={() => {
                        setActiveCardIndex(idx);
                        scrollRef.current?.scrollTo({
                          x: idx * (CARD_WIDTH + CARD_GAP),
                          animated: true,
                        });
                      }}
                      style={[
                        s.dot,
                        activeCardIndex === idx
                          ? [s.dotActive, { backgroundColor: m.theme.accentColor }]
                          : s.dotInactive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  headerIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: Fonts.sizes.lg,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },
  activePill: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  activePillText: { fontSize: 11, fontWeight: "700", color: Colors.primary },

  dayScroll: {
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  dayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 2,
  },
  dayBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  dayBtnText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  dayBtnTextActive: { color: Colors.white },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primaryLight,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: Spacing.md,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  /* Carousel */
  carouselWrapper: {
    marginTop: 6,
    gap: 14,
  },
  carouselContent: {
    paddingHorizontal: SIDE_PADDING,
    gap: CARD_GAP,
  },
  mealCard: {
    width: CARD_WIDTH,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    overflow: "hidden",
    elevation: 5,
  },

  illustrationWrap: {
    position: "relative",
    height: 90,
    width: "100%",
  },
  illustrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  mealBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* Live meal-window progress */
  windowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  windowBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  windowBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  windowLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  cardBody: {
    padding: 16,
    paddingTop: 10,
    gap: 12,
  },
  taglineText: {
    fontSize: 12,
    fontWeight: "700",
  },
  mealTitleText: {
    fontSize: Fonts.sizes.md,
    fontWeight: "600",
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  mealSubtitleText: {
    fontSize: Fonts.sizes.xs,
    lineHeight: 18,
    marginTop: -4,
  },

  macrosGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  macroDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  itemsSection: {
    gap: 6,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ingredientText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },

  doctorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: 4,
  },
  doctorNoteText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 17,
  },

  /* Carousel Dots */
  dotsWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },
});
