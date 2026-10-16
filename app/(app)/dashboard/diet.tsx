import React, { useEffect, useState, useRef, useMemo } from "react";
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
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import {
  fetchUserPlans,
  generateAIUserPlans,
  updateDoctorReviewStatus,
} from "@/lib/api";
import { HealthProfile } from "@/lib/types";
import { HealthProfileModal } from "@/components/HealthProfileModal";
import { UnderDoctorReviewCard } from "@/components/UnderDoctorReviewCard";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";
import { SafeLinearGradient as LinearGradient } from "@/components/ui/SafeLinearGradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 32, 380);
const CARD_GAP = 14;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

const GENESTAC_GRADIENT: readonly [string, string] = ["#12879a", "#5cbf5a"];

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
  pillLabel: string;
  tagline: string;
  subTagIcon: string;
  summaryText: string;
  defaultTime: string;
  defaultStatusLabel: string;
  borderColor: string;
  accentColor: string;
  pillBg: string;
  pillText: string;
  gridBg: string;
  gridBorder: string;
  highlightBg: string;
  highlightBorder: string;
  highlightText: string;
  iconName: string;
  defaultMacros: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
  doctorNote: string;
  defaultImage: string;
}

const MEAL_THEMES: Record<string, MealTheme> = {
  breakfast: {
    title: "Breakfast",
    pillLabel: "BREAKFAST",
    tagline: "First fuel of the day",
    subTagIcon: "sunny",
    summaryText: "Properly balanced for steady energy & weight loss",
    defaultTime: "7:30 AM – 8:30 AM",
    defaultStatusLabel: "Window closed",
    borderColor: "#FED7AA",
    accentColor: "#EA580C",
    pillBg: "#FFEDD5",
    pillText: "#C2410C",
    gridBg: "#FFF7ED",
    gridBorder: "#FED7AA",
    highlightBg: "#FFF7ED",
    highlightBorder: "#FED7AA",
    highlightText: "#C2410C",
    iconName: "sunny",
    defaultMacros: {
      calories: "420 kcal",
      protein: "18g",
      carbs: "48g",
      fat: "12g",
    },
    doctorNote:
      "Portioned to keep you full till lunch without a mid-morning crash.",
    defaultImage:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  lunch: {
    title: "Lunch",
    pillLabel: "LUNCH",
    tagline: "Midday reset",
    subTagIcon: "sunny",
    summaryText: "Ideal balance of protein, carbs, and healthy fats.",
    defaultTime: "1:00 PM – 2:00 PM",
    defaultStatusLabel: "Starts in 2h",
    borderColor: "#BBF7D0",
    accentColor: "#16A34A",
    pillBg: "#DCFCE7",
    pillText: "#15803D",
    gridBg: "#F0FDF4",
    gridBorder: "#BBF7D0",
    highlightBg: "#F0FDF4",
    highlightBorder: "#BBF7D0",
    highlightText: "#15803D",
    iconName: "sunny",
    defaultMacros: {
      calories: "580 kcal",
      protein: "36g",
      carbs: "54g",
      fat: "16g",
    },
    doctorNote:
      "Balanced enough to skip the 3pm slump — steady energy, no sugar spike.",
    defaultImage:
      "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  snacks: {
    title: "Evening Snack",
    pillLabel: "EVENING SNACK",
    tagline: "A small bridge to dinner",
    subTagIcon: "nutrition",
    summaryText: "Measured portions designed for your daily goals",
    defaultTime: "4:30 PM – 5:30 PM",
    defaultStatusLabel: "Starts in 5h",
    borderColor: "#FECDD3",
    accentColor: "#E11D48",
    pillBg: "#FFE4E6",
    pillText: "#BE123C",
    gridBg: "#FFF1F2",
    gridBorder: "#FECDD3",
    highlightBg: "#FFF1F2",
    highlightBorder: "#FECDD3",
    highlightText: "#BE123C",
    iconName: "nutrition",
    defaultMacros: {
      calories: "210 kcal",
      protein: "10g",
      carbs: "24g",
      fat: "6g",
    },
    doctorNote:
      "Light enough to curb hunger without dulling your appetite for dinner.",
    defaultImage:
      "https://images.pexels.com/photos/984516/pexels-photo-984516.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  dinner: {
    title: "Dinner",
    pillLabel: "DINNER",
    tagline: "Wind down, don't wind up",
    subTagIcon: "moon",
    summaryText: "Balanced meal designed by your nutritionist",
    defaultTime: "7:30 PM – 8:30 PM",
    defaultStatusLabel: "Starts in 8h",
    borderColor: "#BFDBFE",
    accentColor: "#2563EB",
    pillBg: "#DBEAFE",
    pillText: "#1D4ED8",
    gridBg: "#EFF6FF",
    gridBorder: "#BFDBFE",
    highlightBg: "#EFF6FF",
    highlightBorder: "#BFDBFE",
    highlightText: "#1D4ED8",
    iconName: "moon",
    defaultMacros: {
      calories: "390 kcal",
      protein: "28g",
      carbs: "26g",
      fat: "10g",
    },
    doctorNote:
      "Warm, easy to digest, and timed so it doesn't fight with your sleep.",
    defaultImage:
      "https://images.pexels.com/photos/36885725/pexels-photo-36885725.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
};

interface FormattedMeal {
  title: string;
  subtitle?: string;
  details?: string[];
  calories?: string;
  image?: string;
  macros?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
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

    let imageStr: string | undefined;
    if (data.image && typeof data.image === "string") imageStr = data.image;
    else if (data.img && typeof data.img === "string") imageStr = data.img;
    else if (data.photo && typeof data.photo === "string")
      imageStr = data.photo;
    else if (data.picture && typeof data.picture === "string")
      imageStr = data.picture;

    let caloriesStr: string | undefined;
    if (data.calories || data.kcal || data.cals) {
      const c = data.calories || data.kcal || data.cals;
      caloriesStr = typeof c === "number" ? `${c} kcal` : String(c);
    }

    let macros:
      | { calories?: string; protein?: string; carbs?: string; fat?: string }
      | undefined;
    if (data.calories || data.protein || data.carbs || data.fat || data.fats) {
      macros = {
        calories: caloriesStr,
        protein: data.protein
          ? typeof data.protein === "number"
            ? `${data.protein}g`
            : String(data.protein)
          : undefined,
        carbs: data.carbs
          ? typeof data.carbs === "number"
            ? `${data.carbs}g`
            : String(data.carbs)
          : undefined,
        fat:
          data.fat || data.fats
            ? typeof (data.fat || data.fats) === "number"
              ? `${data.fat || data.fats}g`
              : String(data.fat || data.fats)
            : undefined,
      };
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

    return {
      title: titleStr || "Healthy Chef Preparation",
      subtitle: subtitleStr,
      details,
      calories: caloriesStr,
      image: imageStr,
      macros,
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

  for (const key of mealKeysOrder) {
    let rawMeal: any = null;
    if (dayData && typeof dayData === "object" && !Array.isArray(dayData)) {
      rawMeal =
        dayData[key] ||
        dayData[key.slice(0, 5)] ||
        dayData[key.charAt(0).toUpperCase() + key.slice(1)];
      if (!rawMeal && key === "snacks") {
        rawMeal =
          dayData["snack"] || dayData["Snack"] || dayData["evening_snack"];
      }
    } else if (Array.isArray(dayData)) {
      const idx = mealKeysOrder.indexOf(key);
      rawMeal = dayData[idx];
    }

    const theme = MEAL_THEMES[key];

    if (rawMeal) {
      const formatted = formatMealItem(rawMeal);
      parsed.push({
        id: key,
        typeLabel: theme.title,
        title: formatted.title || "Balanced Meal",
        subtitle: formatted.subtitle,
        details: formatted.details,
        calories: formatted.calories || theme.defaultMacros.calories,
        image: formatted.image || theme.defaultImage,
        macros: formatted.macros,
        theme,
      });
    } else {
      parsed.push({
        id: key,
        typeLabel: theme.title,
        title: theme.title,
        calories: theme.defaultMacros.calories,
        image: theme.defaultImage,
        theme,
      });
    }
  }

  return parsed;
}

function useMealWindowProgress(timeRange: string) {
  const [progress, setProgress] = useState(0.35);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const parseTime = (t: string) => {
      const [time, period] = t.trim().split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };

    const update = () => {
      try {
        const cleanRange = timeRange.replace("–", "-");
        const [startStr, endStr] = cleanRange.split(" - ");
        if (!startStr || !endStr) return;
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
          setProgress(0.2);
        } else if (nowMins > end) {
          setLabel("Window closed");
          setProgress(1);
        } else {
          setProgress(
            Math.min(1, Math.max(0, (nowMins - start) / (end - start))),
          );
          setLabel(`${end - nowMins} min left`);
        }
      } catch {
        // Fallback gracefully
      }
    };

    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [timeRange]);

  return { progress, label };
}

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
 * Porcelain dish plate component resting on a soft organic pastel wave
 */
function DishPlateWithOrganicBackdrop({
  imageUri,
  mealType,
}: {
  imageUri: string;
  mealType: string;
}) {
  const getBlobConfig = () => {
    switch (mealType) {
      case "breakfast":
        return { c1: "#FED7AA", c2: "#FFEDD5", accent: "#FDBA74" };
      case "lunch":
        return { c1: "#BBF7D0", c2: "#DCFCE7", accent: "#86EFAC" };
      case "snacks":
        return { c1: "#FECDD3", c2: "#FFE4E6", accent: "#FDA4AF" };
      case "dinner":
      default:
        return { c1: "#BFDBFE", c2: "#DBEAFE", accent: "#93C5FD" };
    }
  };

  const { c1, c2, accent } = getBlobConfig();
  const [imgError, setImgError] = useState(false);

  const fallbackUri =
    MEAL_THEMES[mealType]?.defaultImage ||
    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";

  return (
    <View style={s.plateWrapper}>
      {/* Organic Curved Wave Backdrop */}
      <Svg width={140} height={118} viewBox="0 0 140 118" style={s.blobSvg}>
        <Defs>
          <SvgGradient id={`waveGrad_${mealType}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} stopOpacity={0.95} />
            <Stop offset="1" stopColor={c2} stopOpacity={0.45} />
          </SvgGradient>
        </Defs>
        <Path
          d="M38 12 C74 -8, 122 4, 134 38 C146 72, 118 110, 80 114 C42 118, 6 96, 12 58 C16 26, 18 24, 38 12 Z"
          fill={`url(#waveGrad_${mealType})`}
        />
        <Path
          d="M52 24 C84 8, 120 18, 128 48 C134 76, 108 102, 76 106 C50 108, 30 88, 32 60 C34 38, 34 38, 52 24 Z"
          fill={accent}
          opacity={0.35}
        />
      </Svg>

      {/* Real Porcelain Plate Food Photography */}
      <View style={s.plateOuterBorder}>
        <Image
          source={{ uri: imgError ? fallbackUri : imageUri || fallbackUri }}
          onError={() => setImgError(true)}
          style={s.dishPlateImg}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

function MealCardItem({ meal }: { meal: ParsedMeal }) {
  const { theme } = meal;
  const { progress, label } = useMealWindowProgress(theme.defaultTime);

  return (
    <View
      key={meal.id}
      style={[
        s.mealCard,
        {
          borderColor: theme.borderColor,
          shadowColor: theme.accentColor,
        },
      ]}
    >
      {/* Top Header Pill Row */}
      <View style={s.cardTopRow}>
        <View style={[s.mealPill, { backgroundColor: theme.pillBg }]}>
          <Ionicons
            name={theme.iconName as any}
            size={14}
            color={theme.pillText}
          />
          <Text style={[s.mealPillText, { color: theme.pillText }]}>
            {theme.pillLabel}
          </Text>
        </View>

        <View style={s.timeRow}>
          <Ionicons name="time-outline" size={14} color={theme.accentColor} />
          <Text style={[s.timeText, { color: theme.accentColor }]}>
            {theme.defaultTime}
          </Text>
        </View>
      </View>

      {/* Hero Section: Left Progress/Tag/Title + Right Dish Plate */}
      <View style={s.cardHeroRow}>
        <View style={s.cardHeroLeft}>
          {/* Progress Bar & Status */}
          <View style={s.progressRow}>
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${Math.max(28, Math.min(100, (progress || 0.35) * 100))}%`,
                    backgroundColor: theme.accentColor,
                  },
                ]}
              />
            </View>
            <Text style={[s.progressStatusLabel, { color: theme.accentColor }]}>
              {label || theme.defaultStatusLabel}
            </Text>
          </View>

          {/* Subtag Row */}
          <View style={s.subTagRow}>
            <Ionicons
              name={theme.subTagIcon as any}
              size={14}
              color={theme.accentColor}
            />
            <Text style={[s.subTagText, { color: theme.accentColor }]}>
              {theme.tagline}
            </Text>
          </View>

          {/* Meal Title */}
          <Text style={s.mealTitleText} numberOfLines={3}>
            {meal.title}
          </Text>
        </View>

        {/* Right Dish Plate with Organic Wave Backdrop */}
        <DishPlateWithOrganicBackdrop
          imageUri={meal.image || theme.defaultImage}
          mealType={meal.id}
        />
      </View>

      {/* 4-Column Macros Grid */}
      <View
        style={[
          s.macrosGrid,
          {
            backgroundColor: theme.gridBg,
            borderColor: theme.gridBorder,
          },
        ]}
      >
        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.accentColor }]}>
            {meal.macros?.calories ||
              meal.calories ||
              theme.defaultMacros.calories}
          </Text>
          <Text style={s.macroLabel}>Energy</Text>
        </View>

        <View style={[s.macroDivider, { backgroundColor: theme.gridBorder }]} />

        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.accentColor }]}>
            {meal.macros?.protein || theme.defaultMacros.protein}
          </Text>
          <Text style={s.macroLabel}>Protein</Text>
        </View>

        <View style={[s.macroDivider, { backgroundColor: theme.gridBorder }]} />

        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.accentColor }]}>
            {meal.macros?.carbs || theme.defaultMacros.carbs}
          </Text>
          <Text style={s.macroLabel}>Carbs</Text>
        </View>

        <View style={[s.macroDivider, { backgroundColor: theme.gridBorder }]} />

        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.accentColor }]}>
            {meal.macros?.fat || theme.defaultMacros.fat}
          </Text>
          <Text style={s.macroLabel}>Fats</Text>
        </View>
      </View>

      {/* Included Ingredients & Prep */}
      <View style={s.ingredientsSection}>
        <Text style={s.sectionHeading}>Included Ingredients & Prep:</Text>
        {meal.details && meal.details.length > 0 ? (
          meal.details.map((item, idx) => (
            <View key={idx} style={s.ingredientRow}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={theme.accentColor}
              />
              <Text style={s.ingredientText}>{item}</Text>
            </View>
          ))
        ) : (
          <View style={s.ingredientRow}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={theme.accentColor}
            />
            <Text style={s.ingredientText}>{theme.summaryText}</Text>
          </View>
        )}
      </View>

      {/* Doctor / Nutritionist Guidance Box */}
      <View
        style={[
          s.highlightBox,
          {
            backgroundColor: theme.highlightBg,
            borderColor: theme.highlightBorder,
          },
        ]}
      >
        <Ionicons name="sparkles-outline" size={18} color={theme.accentColor} />
        <Text style={[s.doctorNoteText, { color: theme.highlightText }]}>
          {theme.doctorNote}
        </Text>
      </View>
    </View>
  );
}

export function DietContent({ embedded = false }: { embedded?: boolean }) {
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(
    null,
  );
  const [doctorReview, setDoctorReview] = useState<boolean | null>(true);
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

  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDayIdx = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayIdx);

    return DAYS.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const shortLabel =
        dayName.slice(0, 3).charAt(0).toUpperCase() + dayName.slice(1, 3);
      return {
        day: dayName,
        shortLabel,
        dateNum: d.getDate(),
      };
    });
  }, []);

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
      setDoctorReview(userPlan.doctor_review ?? true);
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
    } catch {
      // Handle error
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
    } catch {
      // Handle error
    } finally {
      setApproving(false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index !== activeCardIndex && index >= 0 && index < 4) {
      setActiveCardIndex(index);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
      </View>
    );
  }

  const todayPlan = getDayPlan(dietPlan, selectedDay);
  const meals = parseMeals(todayPlan);

  const Container = embedded ? View : SafeAreaView;
  const containerEdges = embedded ? [] : ["top", "left", "right"];

  return (
    <Container style={s.flex} edges={containerEdges as any}>
      <HealthProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSubmit={handleProfileSubmit}
        loading={generatingPlan}
      />

      {/* Screen Header if accessed standalone */}
      {!embedded && (
        <View style={s.standaloneHeader}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.push("/(app)/dashboard")}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Diet & Nutrition</Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {/* Standalone Segmented Toggle */}
      {!embedded && (
        <View style={s.tabToggleRow}>
          <TouchableOpacity style={s.toggleBtn} activeOpacity={0.8}>
            <LinearGradient
              colors={GENESTAC_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.toggleBtnGradient}
            >
              <Ionicons
                name="restaurant-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={s.toggleBtnTextActive}>Diet</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.toggleBtn}
            onPress={() => router.push("/(app)/dashboard/exercise")}
            activeOpacity={0.8}
          >
            <View style={s.toggleBtnInner}>
              <Ionicons
                name="barbell-outline"
                size={16}
                color="#64748B"
                style={{ marginRight: 6 }}
              />
              <Text style={s.toggleBtnText}>Exercise</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* If Doctor Review is Pending */}
        {doctorReview === false ? (
          <UnderDoctorReviewCard
            healthProfile={healthProfile || undefined}
            onEditProfile={() => setShowProfileModal(true)}
            onApprovePlan={handleApproveDemo}
            approving={approving}
          />
        ) : (
          <>
            {/* Day Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.dayScroll}
            >
              {weekDays.map((item) => {
                const active = selectedDay === item.day;
                const isToday = item.day === today;
                return (
                  <PressableScale
                    key={item.day}
                    onPress={() => {
                      setSelectedDay(item.day);
                      setActiveCardIndex(0);
                      scrollRef.current?.scrollTo({ x: 0, animated: true });
                    }}
                  >
                    {active ? (
                      <LinearGradient
                        colors={GENESTAC_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.dayBtnActive}
                      >
                        <Text style={s.dayNameTextActive}>
                          {item.shortLabel}
                        </Text>
                        <Text style={s.dayNumTextActive}>{item.dateNum}</Text>
                        <View
                          style={[
                            s.todayUnderline,
                            isToday && s.todayUnderlineActive,
                          ]}
                        />
                      </LinearGradient>
                    ) : (
                      <View style={s.dayBtn}>
                        <Text style={s.dayNameText}>{item.shortLabel}</Text>
                        <Text style={s.dayNumText}>{item.dateNum}</Text>
                        <View
                          style={[
                            s.todayUnderline,
                            isToday && s.todayUnderlineInactive,
                          ]}
                        />
                      </View>
                    )}
                  </PressableScale>
                );
              })}
            </ScrollView>

            {/* Meals Carousel Section */}
            <View style={s.carouselWrapper}>
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
                        ? [
                            s.dotActive,
                            { backgroundColor: m.theme.accentColor },
                          ]
                        : s.dotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Container>
  );
}

export default function DietScreen() {
  return <DietContent embedded={false} />;
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  standaloneHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  tabToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 11,
    overflow: "hidden",
  },
  toggleBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
  },
  toggleBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  toggleBtnTextActive: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingVertical: 8,
    gap: 12,
  },
  dayScroll: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  dayBtn: {
    width: 44,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  dayBtnActive: {
    width: 44,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#12879a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  dayNameTextActive: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.white,
  },
  dayNumText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  dayNumTextActive: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.white,
  },
  todayUnderline: {
    width: 14,
    height: 3,
    borderRadius: 2,
    marginTop: 2,
  },
  todayUnderlineActive: {
    backgroundColor: Colors.white,
  },
  todayUnderlineInactive: {
    backgroundColor: "#12879a",
  },
  carouselWrapper: {
    marginTop: 4,
    gap: 12,
  },
  carouselContent: {
    paddingHorizontal: SIDE_PADDING,
    gap: CARD_GAP,
    alignItems: "center",
  },
  mealCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    overflow: "hidden",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
  },
  mealPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 110,
    marginTop: 4,
  },
  cardHeroLeft: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "center",
    gap: 4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  progressTrack: {
    flex: 1,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressStatusLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  subTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  subTagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  mealTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 23,
    letterSpacing: -0.3,
    marginTop: 3,
  },
  plateWrapper: {
    width: 116,
    height: 114,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  blobSvg: {
    position: "absolute",
    top: -2,
    right: -10,
  },
  plateOuterBorder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 3.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },
  dishPlateImg: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  macroValue: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  macroDivider: {
    width: 1,
    height: 22,
  },
  ingredientsSection: {
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  ingredientText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
    lineHeight: 18,
    flex: 1,
  },
  highlightBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  doctorNoteText: {
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
    flex: 1,
  },
  dotsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    width: 22,
  },
  dotInactive: {
    width: 7,
    backgroundColor: "#CBD5E1",
  },
});
