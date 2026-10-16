import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Pedometer } from "expo-sensors";
import { WeightHeroGauge } from "@/components/dashboard/WeightHeroGauge";
import { WeightLossProgressChart } from "@/components/dashboard/WeightLossProgressChart";
import { TransformationGallery } from "@/components/dashboard/TransformationGallery";
import { WaterTrackerWidget } from "@/components/dashboard/WaterTrackerWidget";
import { SleepTrackerWidget } from "@/components/dashboard/SleepTrackerWidget";
import { BodyMeasurementsWidget } from "@/components/dashboard/BodyMeasurementsWidget";
import { HabitsChecklistWidget } from "@/components/dashboard/HabitsChecklistWidget";
import { syncAndroidAutoSleep } from "@/lib/androidSleepTracker";
import {
  WeightLog,
  UserPlan,
  StepLog,
  WaterLog,
  SleepLog,
  MeasurementLog,
  HabitLog,
  WeightJourney,
} from "@/lib/types";
import {
  fetchUserPlans,
  uploadToCloudinary,
  saveUserStepLog,
  saveUserWaterHistory,
  saveUserSleepHistory,
  saveUserMeasurementHistory,
} from "@/lib/api";
import { initStepTracker } from "@/lib/stepTracker";

const screenWidth = Dimensions.get("window").width;

const DAYS = ["7D", "30D", "90D", "All"];

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }
  return dateStr;
};

const formatDateLabel = (dateStr?: string) => {
  if (!dateStr) return "—";
  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const localYesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  const rawDate = dateStr.split("T")[0];
  if (rawDate === localTodayStr) return "Today";
  if (rawDate === localYesterdayStr) return "Yesterday";
  return formatDateShort(dateStr);
};

export default function TrackScreen() {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<
    "weight" | "steps" | "sleep" | "water"
  >("weight");

  // Time filter pills
  const [timeFilter, setTimeFilter] = useState<"Today" | "Week" | "Month">(
    "Today",
  );

  // Weight State
  const [currentWeight, setCurrentWeight] = useState<string>("—");
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [weightNote, setWeightNote] = useState("");
  const [weightImageUri, setWeightImageUri] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>([]);
  const [weightRange, setWeightRange] = useState<string>("All");
  const [startWeight, setStartWeight] = useState<number>(0);
  const [targetWeight, setTargetWeight] = useState<number>(0);
  const [weightDiff, setWeightDiff] = useState<{
    val: string;
    isLoss: boolean;
  } | null>(null);

  const handlePickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera permission is required to take a photo of your scale.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setWeightImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handlePickGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Photo library permission is required to choose a photo.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setWeightImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Steps State
  const [stepsCount, setStepsCount] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [stepHistory, setStepHistory] = useState<StepLog[]>([]);

  // Live Pedometer & Hardware Tracking Refs (Mirrored identically from Home Screen)
  const baseStepsRef = useRef(0);
  const liveDeltaRef = useRef(0);
  const stepGoalRef = useRef(stepsGoal);
  const userIdRef = useRef<string | null>(null);
  const lastSyncedStepsRef = useRef(0);

  useEffect(() => {
    stepGoalRef.current = stepsGoal;
  }, [stepsGoal]);

  const syncStepsToSupabase = useCallback(
    async (count: number, goalVal: number) => {
      const uid = userIdRef.current;
      if (!uid || count <= 0) return;

      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const cals = Math.round(count * 0.045);
      const todayLog: StepLog = {
        date: localTodayStr,
        steps: count,
        goal: goalVal,
        caloriesBurned: cals,
      };

      try {
        await saveUserStepLog(uid, todayLog, goalVal);
        lastSyncedStepsRef.current = count;
      } catch (err) {
        // Suppress warning
      }
    },
    [],
  );

  // 1. Live hardware step tracking subscription
  useEffect(() => {
    let isMounted = true;
    let subscription: { remove: () => void } | null = null;

    const setupPedometer = async () => {
      try {
        await initStepTracker();
        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isMounted || !isAvailable) return;

        // Live foreground step counter — result.steps is delta since subscription start.
        // We add it on top of baseStepsRef (set from DB in loadData) so we never
        // show the raw hardware cumulative total as today's count.
        subscription = Pedometer.watchStepCount((result) => {
          if (!isMounted) return;
          liveDeltaRef.current = result.steps;
          const total = baseStepsRef.current + liveDeltaRef.current;
          setStepsCount(total);
        });
      } catch (err) {
        // Suppress warning
      }
    };

    setupPedometer();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  // 2. Periodic sync of new steps to Supabase (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      const total = baseStepsRef.current + liveDeltaRef.current;
      if (
        total > 0 &&
        total !== lastSyncedStepsRef.current &&
        userIdRef.current
      ) {
        syncStepsToSupabase(total, stepGoalRef.current);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [syncStepsToSupabase]);

  // 3. When returning from background, sync current steps to Supabase
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active" && userIdRef.current) {
          const total = baseStepsRef.current + liveDeltaRef.current;
          if (total > 0 && total !== lastSyncedStepsRef.current) {
            syncStepsToSupabase(total, stepGoalRef.current);
          }
        }
      },
    );

    return () => sub.remove();
  }, [syncStepsToSupabase]);

  // Sleep State
  const [sleepHours, setSleepHours] = useState("0h");
  const [sleepHoursNum, setSleepHoursNum] = useState<number>(7.5);
  const [deepSleep, setDeepSleep] = useState("0h");
  const [lightSleep, setLightSleep] = useState("0h");
  const [remSleep, setRemSleep] = useState("0h");
  const [sleepHistory, setSleepHistory] = useState<SleepLog[]>([]);
  const [todaySleepObj, setTodaySleepObj] = useState<SleepLog>({
    date: new Date().toISOString().split("T")[0],
    hours: 7.5,
    source: "manual",
  });
  const [isAutoSyncingSleep, setIsAutoSyncingSleep] = useState<boolean>(false);
  const [isStepHistoryExpanded, setIsStepHistoryExpanded] = useState(false);
  const [isSleepHistoryExpanded, setIsSleepHistoryExpanded] = useState(false);

  // Water State
  const [waterAmount, setWaterAmount] = useState<number>(0.0);
  const [waterHistory, setWaterHistory] = useState<WaterLog[]>([]);
  const [isWaterHistoryExpanded, setIsWaterHistoryExpanded] = useState(false);

  // Body Measurements State
  const [waist, setWaist] = useState<string>("");
  const [hips, setHips] = useState<string>("");
  const [chest, setChest] = useState<string>("");
  const [savingMeasurements, setSavingMeasurements] = useState<boolean>(false);

  // Habits State
  const [habits, setHabits] = useState<Record<string, boolean>>({});

  // Journey Ref
  const journeyRef = useRef<WeightJourney>({ history: [] });

  useEffect(() => {
    if (params.tab === "steps") setActiveTab("steps");
    else if (params.tab === "sleep") setActiveTab("sleep");
    else if (params.tab === "water") setActiveTab("water");
    else if (params.tab === "weight") setActiveTab("weight");

    if (params.log === "weight" || params.openModal === "weight") {
      setActiveTab("weight");
      setShowWeightModal(true);
    }
  }, [params.tab, params.log, params.openModal, params.t]);

  // Load real weight, steps, sleep, water, measurements & habits from Supabase
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const uid = session.user.id;
      userIdRef.current = uid;

      const [userRes, planData] = await Promise.all([
        supabase
          .from("users")
          .select("weight_loss_journey")
          .eq("id", uid)
          .maybeSingle(),
        fetchUserPlans(uid),
      ]);

      const journey: WeightJourney = userRes?.data?.weight_loss_journey || {
        history: [],
      };
      journeyRef.current = journey;
      const todayStr = new Date().toISOString().split("T")[0];

      // ── WEIGHT ──
      if (journey.targetGoal) setTargetWeight(journey.targetGoal);
      if (journey.startingWeight) setStartWeight(journey.startingWeight);

      if (Array.isArray(journey.history) && journey.history.length > 0) {
        const sorted = [...journey.history].sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        setWeightHistory(sorted);
        const latest = sorted[sorted.length - 1]?.weight;
        if (latest) setCurrentWeight(String(latest));

        if (sorted.length >= 2) {
          const first = sorted[0].weight;
          const current = sorted[sorted.length - 1].weight;
          const diff = parseFloat((current - first).toFixed(1));
          setWeightDiff({
            val: `${Math.abs(diff)} kg`,
            isLoss: diff <= 0,
          });
        }
      }

      // ── STEPS ──
      const now = new Date();
      const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const isoTodayStr = now.toISOString().split("T")[0];

      const stepLogs = planData?.steps_history || journey?.stepLogs || [];
      setStepHistory(stepLogs);

      const todayStep = stepLogs.find(
        (s: any) =>
          s.date?.startsWith(localTodayStr) || s.date?.startsWith(isoTodayStr),
      );
      const dbSteps = todayStep?.steps ?? 0;
      const sGoal = todayStep?.goal || journey?.stepGoal || 10000;
      setStepsGoal(sGoal);
      stepGoalRef.current = sGoal;

      // Use DB value as the authoritative baseline. The live pedometer watcher
      // (watchStepCount) will add a clean delta on top once it fires.
      if (dbSteps > baseStepsRef.current) {
        baseStepsRef.current = dbSteps;
        liveDeltaRef.current = 0;
      }
      const effectiveSteps = baseStepsRef.current + liveDeltaRef.current;
      setStepsCount(effectiveSteps);

      // ── WATER ──
      const waterLogs = planData?.water_history || journey?.waterLogs || [];
      setWaterHistory(waterLogs);
      const todayWater = waterLogs.find((w: any) => w.date === todayStr);
      setWaterAmount(todayWater?.amount ?? 0);

      // ── SLEEP ──
      const sleepLogs = planData?.sleep_history || journey?.sleepLogs || [];
      setSleepHistory(sleepLogs);
      const todaySleep = sleepLogs.find((s: any) =>
        s.date?.startsWith(todayStr),
      );
      if (todaySleep?.hours != null) {
        const hrs = todaySleep.hours;
        setSleepHoursNum(hrs);
        setSleepHours(`${hrs}h`);
        const deepH = Number((hrs * 0.25).toFixed(1));
        const remH = Number((hrs * 0.2).toFixed(1));
        const lightH = Number((hrs - deepH - remH).toFixed(1));
        setDeepSleep(`${deepH}h`);
        setLightSleep(`${lightH}h`);
        setRemSleep(`${remH}h`);
        setTodaySleepObj(todaySleep);
      } else {
        setSleepHoursNum(7.5);
        setSleepHours("0h");
        setDeepSleep("0h");
        setLightSleep("0h");
        setRemSleep("0h");
        setTodaySleepObj({
          date: todayStr,
          hours: 7.5,
          source: "manual",
        });
        // Auto-sync sleep in background from Android when no entry exists today
        syncAndroidAutoSleep(uid, sleepLogs)
          .then((result) => {
            if (result.success && result.log.hours > 0) {
              setSleepHoursNum(result.log.hours);
              setSleepHours(`${result.log.hours}h`);
              if (result.log.deepSleepHours)
                setDeepSleep(`${result.log.deepSleepHours}h`);
              if (result.log.lightSleepHours)
                setLightSleep(`${result.log.lightSleepHours}h`);
              if (result.log.remSleepHours)
                setRemSleep(`${result.log.remSleepHours}h`);
              setTodaySleepObj(result.log);
            }
          })
          .catch((e) => console.log("Background auto sleep check:", e));
      }

      // ── BODY MEASUREMENTS ──
      const measurements =
        planData?.measurement_history || journey?.measurements || [];
      if (measurements && measurements.length > 0) {
        const latestM = measurements[measurements.length - 1];
        if (latestM.waist) setWaist(String(latestM.waist));
        if (latestM.hips) setHips(String(latestM.hips));
        if (latestM.chest) setChest(String(latestM.chest));
      }

      // ── DAILY HABITS ──
      const todayHabits = journey?.habitLogs?.find(
        (h: any) => h.date === todayStr,
      );
      if (todayHabits?.habits) {
        setHabits(todayHabits.habits);
      }
    });
  }, []);

  // Water handlers
  const handleWaterAdd = async (amountToAdd: number) => {
    const today = new Date().toISOString().split("T")[0];
    const newTotal = parseFloat((waterAmount + amountToAdd).toFixed(2));
    setWaterAmount(newTotal);
    const currentLogs = journeyRef.current?.waterLogs || waterHistory || [];
    const waterLogs = [...currentLogs];
    const idx = waterLogs.findIndex((w: any) => w.date === today);
    if (idx >= 0) waterLogs[idx] = { ...waterLogs[idx], amount: newTotal };
    else waterLogs.push({ date: today, amount: newTotal });
    journeyRef.current = { ...journeyRef.current, waterLogs };
    setWaterHistory(waterLogs);
    if (userIdRef.current) {
      await saveUserWaterHistory(userIdRef.current, waterLogs);
    }
  };

  const handleWaterReset = async () => {
    const today = new Date().toISOString().split("T")[0];
    setWaterAmount(0);
    const currentLogs = journeyRef.current?.waterLogs || waterHistory || [];
    const waterLogs = [...currentLogs];
    const idx = waterLogs.findIndex((w: any) => w.date === today);
    if (idx >= 0) waterLogs[idx] = { ...waterLogs[idx], amount: 0 };
    journeyRef.current = { ...journeyRef.current, waterLogs };
    setWaterHistory(waterLogs);
    if (userIdRef.current) {
      await saveUserWaterHistory(userIdRef.current, waterLogs);
    }
  };

  // Sleep Auto-Sync & Manual handlers
  const handleTriggerAutoSleepSync = async (silent = false) => {
    setIsAutoSyncingSleep(true);
    try {
      const result = await syncAndroidAutoSleep(
        userIdRef.current || undefined,
        sleepHistory,
      );
      if (result.success) {
        setSleepHoursNum(result.log.hours);
        setSleepHours(`${result.log.hours}h`);
        if (result.log.deepSleepHours)
          setDeepSleep(`${result.log.deepSleepHours}h`);
        if (result.log.lightSleepHours)
          setLightSleep(`${result.log.lightSleepHours}h`);
        if (result.log.remSleepHours)
          setRemSleep(`${result.log.remSleepHours}h`);
        setTodaySleepObj(result.log);

        const today = result.log.date;
        const updated = [...sleepHistory];
        const idx = updated.findIndex((s) => s.date === today);
        if (idx >= 0) updated[idx] = result.log;
        else updated.push(result.log);
        setSleepHistory(updated);

        if (!silent) {
          Alert.alert("Auto-Sync Complete", result.message);
        }
      }
    } catch (err) {
      console.warn("Auto sleep sync error:", err);
      if (!silent) {
        Alert.alert(
          "Auto-Sync Notice",
          "Unable to sync automatically right now. You can log manually.",
        );
      }
    } finally {
      setIsAutoSyncingSleep(false);
    }
  };

  const handleSleepSave = async () => {
    const today = new Date().toISOString().split("T")[0];
    const sleepLogs = [...(journeyRef.current?.sleepLogs || [])];
    const idx = sleepLogs.findIndex((s: any) => s.date === today);
    const entry: SleepLog = {
      ...todaySleepObj,
      date: today,
      hours: sleepHoursNum,
      source: "manual",
    };
    if (idx >= 0) sleepLogs[idx] = entry;
    else sleepLogs.push(entry);
    journeyRef.current = { ...journeyRef.current, sleepLogs };
    setSleepHistory(sleepLogs);
    setTodaySleepObj(entry);
    if (userIdRef.current) {
      await saveUserSleepHistory(userIdRef.current, sleepLogs);
    }
    setSleepHours(`${sleepHoursNum}h`);
    Alert.alert("Saved", `Logged ${sleepHoursNum} hrs of sleep.`);
  };

  // Measurements handler
  const handleSaveMeasurements = async () => {
    setSavingMeasurements(true);
    const today = new Date().toISOString().split("T")[0];
    const measurements = [...(journeyRef.current?.measurements || [])];
    const idx = measurements.findIndex((m: any) => m.date === today);
    const entry: MeasurementLog = {
      date: today,
      waist: waist ? parseFloat(waist) : undefined,
      hips: hips ? parseFloat(hips) : undefined,
      chest: chest ? parseFloat(chest) : undefined,
    };
    if (idx >= 0) measurements[idx] = entry;
    else measurements.push(entry);
    journeyRef.current = { ...journeyRef.current, measurements };
    if (userIdRef.current) {
      await saveUserMeasurementHistory(userIdRef.current, measurements);
    }
    setSavingMeasurements(false);
    Alert.alert("Saved", "Body measurements saved successfully.");
  };

  // Habits handler
  const handleHabitToggle = async (key: string) => {
    const newHabits = { ...habits, [key]: !habits[key] };
    setHabits(newHabits);
    const today = new Date().toISOString().split("T")[0];
    const habitLogs = [...(journeyRef.current?.habitLogs || [])];
    const idx = habitLogs.findIndex((h: any) => h.date === today);
    if (idx >= 0) habitLogs[idx].habits = newHabits;
    else habitLogs.push({ date: today, habits: newHabits });
    journeyRef.current = { ...journeyRef.current, habitLogs };
    if (userIdRef.current) {
      await supabase
        .from("users")
        .update({ weight_loss_journey: journeyRef.current })
        .eq("id", userIdRef.current);
    }
  };

  const handleSaveWeight = async () => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || val <= 20 || val >= 300) {
      Alert.alert(
        "Invalid Weight",
        "Please enter a valid weight in kg (e.g. 72.4).",
      );
      return;
    }

    setIsUploadingPhoto(true);
    let finalImageUrl = weightImageUri;
    if (weightImageUri && !weightImageUri.startsWith("http")) {
      try {
        finalImageUrl = await uploadToCloudinary(weightImageUri);
      } catch (err) {
        console.warn("Cloudinary upload error:", err);
      }
    }

    setCurrentWeight(val.toFixed(1));
    setShowWeightModal(false);
    const savedNote = weightNote;
    const savedImage = finalImageUrl;
    setNewWeight("");
    setWeightNote("");
    setWeightImageUri(null);
    setIsUploadingPhoto(false);

    // Optimistic local state update so all logged dates immediately update on chart
    const todayStr = new Date().toISOString().split("T")[0];
    const prevHistory = [...weightHistory];
    const prevIdx = prevHistory.findIndex((e: any) =>
      e.date?.startsWith(todayStr),
    );
    const optimisticEntry: WeightLog = {
      date: todayStr,
      weight: val,
      note: savedNote || undefined,
      image_url: savedImage || undefined,
    };
    if (prevIdx >= 0) prevHistory[prevIdx] = optimisticEntry;
    else prevHistory.push(optimisticEntry);
    const optimisticSorted = [...prevHistory].sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    setWeightHistory(optimisticSorted);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      const { data: user } = await supabase
        .from("users")
        .select("weight_loss_journey")
        .eq("id", uid)
        .maybeSingle();

      const journey = user?.weight_loss_journey || { history: [] };
      const history = Array.isArray(journey.history)
        ? [...journey.history]
        : [];
      const idx = history.findIndex((e: any) => e.date?.startsWith(todayStr));
      const entry: WeightLog = {
        date: todayStr,
        weight: val,
        note: savedNote || undefined,
        image_url: savedImage || undefined,
      };
      if (idx >= 0) history[idx] = entry;
      else history.push(entry);

      const sorted = [...history].sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setWeightHistory(sorted);

      await supabase
        .from("users")
        .update({ weight_loss_journey: { ...journey, history: sorted } })
        .eq("id", uid);

      Alert.alert("Success", `Weight updated to ${val.toFixed(1)} kg!`);
    } catch {
      // Local state is already updated
    }
  };

  const getFilteredWeightHistory = () => {
    if (!weightHistory || weightHistory.length === 0) return [];
    if (weightRange === "All") return weightHistory;
    const targetCount =
      weightRange === "7D" ? 7 : weightRange === "30D" ? 30 : 90;
    const days = targetCount;
    const latestDate = new Date(weightHistory[weightHistory.length - 1].date);
    const cutoff = new Date(latestDate);
    cutoff.setDate(cutoff.getDate() - days);
    const res = weightHistory.filter((e) => new Date(e.date) >= cutoff);
    if (res.length >= 2) {
      return res;
    }
    // If strict date filter leaves fewer than 2 entries, provide the most recent targetCount entries
    return weightHistory.slice(-targetCount);
  };

  const chartData = getFilteredWeightHistory();
  const mainChartWidth = Math.max(screenWidth - 48, chartData.length * 56);
  const chartWeights = chartData.length
    ? chartData.map((e) => e.weight)
    : [targetWeight, startWeight];
  const minWeightBound = Math.max(0, Math.min(...chartWeights) - 2);
  const maxWeightBound = Math.max(...chartWeights) + 2;
  const chartSegments = 5;

  // Steps metrics calculated dynamically from live steps + DB history
  const displayedSteps = useMemo(() => {
    if (timeFilter === "Today") return stepsCount;
    if (!stepHistory || stepHistory.length === 0) return stepsCount;

    const now = new Date();
    const days = timeFilter === "Week" ? 7 : 30;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const pastLogs = stepHistory.filter((s) => {
      const isToday = s.date?.startsWith(localToday);
      const isAfterCutoff = new Date(s.date) >= cutoff;
      return !isToday && isAfterCutoff;
    });

    const pastTotal = pastLogs.reduce(
      (acc, curr) => acc + (curr.steps || 0),
      0,
    );
    return pastTotal + stepsCount;
  }, [timeFilter, stepsCount, stepHistory]);

  const displayedGoal = useMemo(() => {
    if (timeFilter === "Today") return stepsGoal;
    if (timeFilter === "Week") return stepsGoal * 7;
    return stepsGoal * 30;
  }, [timeFilter, stepsGoal]);

  const caloriesBurned = Math.round(displayedSteps * 0.045);
  const distanceKm = (displayedSteps * 0.00075).toFixed(1);
  const activeMinutes = Math.round(displayedSteps / 120);

  // Sorted Steps History (Newest first, dynamically incorporating today's live steps)
  const sortedStepHistory = useMemo(() => {
    const list = [...stepHistory];
    const now = new Date();
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayIdx = list.findIndex(
      (s) => s.date?.startsWith(localTodayStr) || s.date === localTodayStr,
    );
    if (todayIdx >= 0) {
      list[todayIdx] = {
        ...list[todayIdx],
        steps: Math.max(list[todayIdx].steps || 0, displayedSteps),
        goal: list[todayIdx].goal || stepsGoal,
      };
    } else if (displayedSteps > 0) {
      list.push({
        date: localTodayStr,
        steps: displayedSteps,
        goal: stepsGoal,
        caloriesBurned: caloriesBurned,
        distanceKm: parseFloat(distanceKm),
      });
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [stepHistory, displayedSteps, stepsGoal, caloriesBurned, distanceKm]);

  // Sorted Sleep History (Newest first, dynamically incorporating today's sleep if logged)
  const sortedSleepHistory = useMemo(() => {
    const list = [...sleepHistory];
    const todayStr = new Date().toISOString().split("T")[0];
    const todayIdx = list.findIndex((s) => s.date?.startsWith(todayStr));
    if (todayIdx < 0 && sleepHoursNum > 0 && sleepHours !== "0h") {
      list.push({
        date: todayStr,
        hours: sleepHoursNum,
      });
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [sleepHistory, sleepHoursNum, sleepHours]);

  const displayedStepHistory = useMemo(() => {
    return isStepHistoryExpanded
      ? sortedStepHistory
      : sortedStepHistory.slice(0, 3);
  }, [sortedStepHistory, isStepHistoryExpanded]);

  const displayedSleepHistory = useMemo(() => {
    return isSleepHistoryExpanded
      ? sortedSleepHistory
      : sortedSleepHistory.slice(0, 3);
  }, [sortedSleepHistory, isSleepHistoryExpanded]);

  // Sorted Water History (Newest first, dynamically incorporating today's intake)
  const sortedWaterHistory = useMemo(() => {
    const list = [...waterHistory];
    const todayStr = new Date().toISOString().split("T")[0];
    const todayIdx = list.findIndex((w) => w.date?.startsWith(todayStr));
    if (todayIdx < 0 && waterAmount > 0) {
      list.push({
        date: todayStr,
        amount: waterAmount,
      });
    } else if (todayIdx >= 0) {
      list[todayIdx] = { ...list[todayIdx], amount: waterAmount };
    }
    return list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [waterHistory, waterAmount]);

  const displayedWaterHistory = useMemo(() => {
    return isWaterHistoryExpanded
      ? sortedWaterHistory
      : sortedWaterHistory.slice(0, 3);
  }, [sortedWaterHistory, isWaterHistoryExpanded]);

  // Dynamic Step Ring Calculation for Track Screen
  const stepRingSize = 170;
  const stepRingStroke = 9;
  const stepRingCenter = stepRingSize / 2;
  const stepRingRadius = (stepRingSize - stepRingStroke) / 2;
  const stepRingCircumference = 2 * Math.PI * stepRingRadius;
  const stepRingProgress = Math.min(
    1,
    Math.max(0, displayedSteps / (displayedGoal || 10000)),
  );
  const stepRingDashoffset =
    stepRingCircumference - stepRingCircumference * stepRingProgress;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/(app)/dashboard")}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {activeTab === "weight" && "Weight Management"}
          {activeTab === "steps" && "Steps"}
          {activeTab === "sleep" && "Sleep"}
          {activeTab === "water" && "Water Hydration"}
        </Text>

        <TouchableOpacity style={styles.calendarIconBtn}>
          <Ionicons name="calendar-outline" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Segmented Top Selector */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "weight" && styles.toggleBtnActive,
          ]}
          onPress={() => setActiveTab("weight")}
        >
          <Ionicons
            name="scale-outline"
            size={16}
            color={activeTab === "weight" ? "#0A8554" : "#64748B"}
          />
          <Text
            style={[
              styles.toggleBtnText,
              activeTab === "weight" && styles.toggleBtnTextActive,
            ]}
          >
            Weight
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "steps" && styles.toggleBtnActive,
          ]}
          onPress={() => setActiveTab("steps")}
        >
          <Ionicons
            name="walk-outline"
            size={16}
            color={activeTab === "steps" ? "#0A8554" : "#64748B"}
          />
          <Text
            style={[
              styles.toggleBtnText,
              activeTab === "steps" && styles.toggleBtnTextActive,
            ]}
          >
            Steps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "sleep" && styles.toggleBtnActive,
          ]}
          onPress={() => setActiveTab("sleep")}
        >
          <Ionicons
            name="moon-outline"
            size={16}
            color={activeTab === "sleep" ? "#0A8554" : "#64748B"}
          />
          <Text
            style={[
              styles.toggleBtnText,
              activeTab === "sleep" && styles.toggleBtnTextActive,
            ]}
          >
            Sleep
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "water" && styles.toggleBtnActive,
          ]}
          onPress={() => setActiveTab("water")}
        >
          <Ionicons
            name="water-outline"
            size={16}
            color={activeTab === "water" ? "#0A8554" : "#64748B"}
          />
          <Text
            style={[
              styles.toggleBtnText,
              activeTab === "water" && styles.toggleBtnTextActive,
            ]}
          >
            Water
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. WEIGHT VIEW ── */}
        {activeTab === "weight" && (
          <View style={styles.weightTabCol}>
            {/* Hero Circular Gauge */}
            <WeightHeroGauge
              currentWeight={currentWeight !== "—" ? currentWeight : "72.4"}
              diffVal={weightDiff ? weightDiff.val : "1.2 kg"}
              isLoss={weightDiff ? weightDiff.isLoss : true}
              subtext={
                weightDiff
                  ? weightDiff.isLoss
                    ? "since last week"
                    : "gained overall"
                  : "since last week"
              }
              progressPercent={0.68}
            />

            {/* Log Weight Action Card */}
            <TouchableOpacity
              style={styles.actionCardWrap}
              onPress={() => setShowWeightModal(true)}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#F0FDF9", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionCameraIconBadge}>
                  <Ionicons name="camera" size={24} color="#059669" />
                </View>
                <View style={styles.actionCardTextCol}>
                  <Text style={styles.actionCardTitle}>Log Your Weight</Text>
                  <Text style={styles.actionCardSubtitle}>
                    Take a photo or enter manually
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Your Progress Chart Card */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressCardTitle}>Your Progress</Text>
                <View style={styles.rangePillsRow}>
                  {DAYS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.rangePillBtn,
                        weightRange === d && styles.rangePillBtnActive,
                      ]}
                      onPress={() => setWeightRange(d)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.rangePillText,
                          weightRange === d && styles.rangePillTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <WeightLossProgressChart
                chartData={chartData}
                timeFilter={timeFilter}
                weightRange={weightRange}
              />
            </View>

            {/* Transformation Gallery */}
            <TransformationGallery
              history={weightHistory}
              startWeight={startWeight}
              formatDateShort={formatDateShort}
            />

            {/* ── 6. BODY MEASUREMENTS TRACKER ── */}
            <BodyMeasurementsWidget
              waist={waist}
              setWaist={setWaist}
              hips={hips}
              setHips={setHips}
              chest={chest}
              setChest={setChest}
              saving={savingMeasurements}
              onSave={handleSaveMeasurements}
            />

            {/* ── 7. DAILY HABITS CHECKLIST ── */}
            <HabitsChecklistWidget
              habits={habits}
              onToggleHabit={handleHabitToggle}
            />
          </View>
        )}

        {/* ── 2. STEPS VIEW (Screen 4) ── */}
        {activeTab === "steps" && (
          <View style={styles.tabContentCol}>
            {/* Steps Ring Card */}
            <View style={styles.heroGaugeCard}>
              <View style={styles.gaugeArcContainer}>
                <Svg width={stepRingSize} height={stepRingSize}>
                  {/* Background Track Circle */}
                  <Circle
                    cx={stepRingCenter}
                    cy={stepRingCenter}
                    r={stepRingRadius}
                    stroke="#E2E8F0"
                    strokeWidth={stepRingStroke}
                    fill="transparent"
                  />
                  {/* Active Green Progress Arc */}
                  {stepRingProgress > 0 && (
                    <Circle
                      cx={stepRingCenter}
                      cy={stepRingCenter}
                      r={stepRingRadius}
                      stroke="#0A8554"
                      strokeWidth={stepRingStroke}
                      strokeDasharray={`${stepRingCircumference}`}
                      strokeDashoffset={stepRingDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      origin={`${stepRingCenter}, ${stepRingCenter}`}
                      rotation="-90"
                    />
                  )}
                </Svg>
                <View style={styles.gaugeArcInnerContent}>
                  <View
                    style={[
                      styles.scaleMiniIconCircle,
                      { backgroundColor: "#ECFDF5" },
                    ]}
                  >
                    <Ionicons name="footsteps" size={22} color="#0A8554" />
                  </View>
                  <Text style={styles.gaugeBigValue}>
                    {displayedSteps.toLocaleString()}
                  </Text>
                  <Text style={styles.gaugeSublabel}>steps</Text>
                  <Text style={styles.stepsGoalText}>
                    of {displayedGoal.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3 Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Ionicons name="flame-outline" size={20} color="#EA580C" />
                <Text style={styles.metricValue}>{caloriesBurned} kcal</Text>
                <Text style={styles.metricLabel}>Calories</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="navigate-outline" size={20} color="#0284C7" />
                <Text style={styles.metricValue}>{distanceKm} km</Text>
                <Text style={styles.metricLabel}>Distance</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="time-outline" size={20} color="#7C3AED" />
                <Text style={styles.metricValue}>{activeMinutes} min</Text>
                <Text style={styles.metricLabel}>Active Time</Text>
              </View>
            </View>

            {/* Motivational Banner */}
            <View style={styles.motivationalCard}>
              <View style={styles.motivationalIconBg}>
                <Ionicons name="walk" size={22} color="#0A8554" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.motivationalTitle}>
                  Move a little more today
                </Text>
                <Text style={styles.motivationalSub}>
                  You're doing great! Keep it up.
                </Text>
              </View>
            </View>

            {/* ── STEPS HISTORY SECTION ── */}
            <View style={styles.historySectionCard}>
              <View style={styles.historyHeaderRow}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  activeOpacity={0.7}
                  onPress={() => setIsStepHistoryExpanded((prev) => !prev)}
                >
                  <View style={styles.historySectionIconWrap}>
                    <Ionicons name="footsteps" size={16} color="#0A8554" />
                  </View>
                  <Text style={styles.historySectionTitle}>Step History</Text>
                  <View style={styles.historyChevronBtn}>
                    <Ionicons
                      name={
                        isStepHistoryExpanded ? "chevron-up" : "chevron-down"
                      }
                      size={18}
                      color="#0A8554"
                    />
                  </View>
                </TouchableOpacity>
                <View style={styles.historyCountPill}>
                  <Text style={styles.historyCountPillText}>
                    {sortedStepHistory.length}{" "}
                    {sortedStepHistory.length === 1 ? "Day" : "Days"} Logged
                  </Text>
                </View>
              </View>

              {sortedStepHistory.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Ionicons
                    name="footsteps-outline"
                    size={32}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyHistoryTitle}>No Step Logs Yet</Text>
                  <Text style={styles.emptyHistorySubtitle}>
                    Your daily steps will automatically log here as you walk.
                  </Text>
                </View>
              ) : (
                <View style={styles.historyListCol}>
                  {displayedStepHistory.map((item, idx) => {
                    const itemGoal = item.goal || stepsGoal || 10000;
                    const percent = Math.min(
                      100,
                      Math.round((item.steps / itemGoal) * 100),
                    );
                    const isGoalAchieved = item.steps >= itemGoal;
                    const itemDist =
                      item.distanceKm || (item.steps * 0.000762).toFixed(2);
                    const itemCals =
                      item.caloriesBurned || Math.round(item.steps * 0.045);

                    return (
                      <View key={idx} style={styles.historyItemRow}>
                        <View
                          style={[
                            styles.historyItemIconBg,
                            {
                              backgroundColor: isGoalAchieved
                                ? "#ECFDF5"
                                : "#F1F5F9",
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              isGoalAchieved ? "checkmark-circle" : "footsteps"
                            }
                            size={18}
                            color={isGoalAchieved ? "#0A8554" : "#64748B"}
                          />
                        </View>

                        <View style={{ flex: 1, gap: 4 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.historyItemDate}>
                              {formatDateLabel(item.date)}
                            </Text>
                            <Text style={styles.historyItemMainVal}>
                              {item.steps.toLocaleString()}{" "}
                              <Text style={styles.historyItemSubUnit}>
                                steps
                              </Text>
                            </Text>
                          </View>

                          {/* Mini Progress Bar */}
                          <View style={styles.historyMiniProgressBg}>
                            <View
                              style={[
                                styles.historyMiniProgressFill,
                                {
                                  width: `${percent}%`,
                                  backgroundColor: isGoalAchieved
                                    ? "#0A8554"
                                    : "#3B82F6",
                                },
                              ]}
                            />
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.historyItemSubInfo}>
                              {itemDist} km · {itemCals} kcal
                            </Text>
                            <Text
                              style={[
                                styles.historyGoalTag,
                                {
                                  color: isGoalAchieved ? "#0A8554" : "#64748B",
                                },
                              ]}
                            >
                              {percent}% of {itemGoal.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {sortedStepHistory.length > 3 && (
                    <TouchableOpacity
                      style={styles.expandToggleFooter}
                      onPress={() => setIsStepHistoryExpanded((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.expandToggleFooterText}>
                        {isStepHistoryExpanded
                          ? "Show Less"
                          : `View All ${sortedStepHistory.length} Days`}
                      </Text>
                      <Ionicons
                        name={
                          isStepHistoryExpanded ? "chevron-up" : "chevron-down"
                        }
                        size={14}
                        color="#0A8554"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── 3. SLEEP VIEW (Screen 6) ── */}
        {activeTab === "sleep" && (
          <View style={styles.tabContentCol}>
            {/* Sleep Logger Widget */}
            <SleepTrackerWidget
              todaySleep={{
                ...todaySleepObj,
                hours: sleepHoursNum,
              }}
              onLogSleep={handleSleepSave}
              onIncreaseSleep={() => {
                const next = parseFloat((sleepHoursNum + 0.5).toFixed(1));
                setSleepHoursNum(next);
                setTodaySleepObj((prev) => ({
                  ...prev,
                  hours: next,
                  source: "manual",
                }));
              }}
              onDecreaseSleep={() => {
                const next = Math.max(
                  0,
                  parseFloat((sleepHoursNum - 0.5).toFixed(1)),
                );
                setSleepHoursNum(next);
                setTodaySleepObj((prev) => ({
                  ...prev,
                  hours: next,
                  source: "manual",
                }));
              }}
              onTriggerAutoSync={() => handleTriggerAutoSleepSync(false)}
              isAutoSyncing={isAutoSyncingSleep}
            />

            {/* Sleep Recovery Tip Card */}
            <View
              style={[
                styles.motivationalCard,
                { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },
              ]}
            >
              <View
                style={[
                  styles.motivationalIconBg,
                  { backgroundColor: "#EDE9FE" },
                ]}
              >
                <Ionicons name="moon-outline" size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.motivationalTitle, { color: "#4C1D95" }]}>
                  Restful Sleep
                </Text>
                <Text style={[styles.motivationalSub, { color: "#6D28D9" }]}>
                  Good sleep helps your body recover and improves focus.
                </Text>
              </View>
            </View>

            {/* ── SLEEP HISTORY SECTION ── */}
            <View style={styles.historySectionCard}>
              <View style={styles.historyHeaderRow}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  activeOpacity={0.7}
                  onPress={() => setIsSleepHistoryExpanded((prev) => !prev)}
                >
                  <View
                    style={[
                      styles.historySectionIconWrap,
                      { backgroundColor: "#EEF2FF" },
                    ]}
                  >
                    <Ionicons name="moon" size={16} color="#6366F1" />
                  </View>
                  <Text style={styles.historySectionTitle}>Sleep History</Text>
                  <View
                    style={[
                      styles.historyChevronBtn,
                      { backgroundColor: "#EEF2FF" },
                    ]}
                  >
                    <Ionicons
                      name={
                        isSleepHistoryExpanded ? "chevron-up" : "chevron-down"
                      }
                      size={18}
                      color="#6366F1"
                    />
                  </View>
                </TouchableOpacity>
                <View
                  style={[
                    styles.historyCountPill,
                    { backgroundColor: "#EEF2FF" },
                  ]}
                >
                  <Text
                    style={[styles.historyCountPillText, { color: "#4F46E5" }]}
                  >
                    {sortedSleepHistory.length}{" "}
                    {sortedSleepHistory.length === 1 ? "Log" : "Logs"}
                  </Text>
                </View>
              </View>

              {sortedSleepHistory.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Ionicons name="moon-outline" size={32} color="#94A3B8" />
                  <Text style={styles.emptyHistoryTitle}>
                    No Sleep Logs Yet
                  </Text>
                  <Text style={styles.emptyHistorySubtitle}>
                    Use the counter above and tap "Save Sleep" to record your
                    sleep duration.
                  </Text>
                </View>
              ) : (
                <View style={styles.historyListCol}>
                  {displayedSleepHistory.map((item, idx) => {
                    const hrs = item.hours;
                    const h = Math.floor(hrs);
                    const m = Math.round((hrs % 1) * 60);
                    const isOptimal = hrs >= 7.5 && hrs <= 9;
                    const stageColor =
                      hrs < 6
                        ? "#D97706"
                        : hrs > 9
                          ? "#059669"
                          : isOptimal
                            ? "#6366F1"
                            : "#2563EB";
                    const stageBg =
                      hrs < 6
                        ? "#FEF3C7"
                        : hrs > 9
                          ? "#ECFDF5"
                          : isOptimal
                            ? "#EEF2FF"
                            : "#EFF6FF";
                    const stageLabel =
                      hrs < 6
                        ? "Light Rest"
                        : hrs > 9
                          ? "Extended"
                          : isOptimal
                            ? "Optimal"
                            : "Good Rest";

                    const sleepGoal = 8.0;
                    const percent = Math.min(
                      100,
                      Math.round((hrs / sleepGoal) * 100),
                    );

                    return (
                      <View key={idx} style={styles.historyItemRow}>
                        <View
                          style={[
                            styles.historyItemIconBg,
                            { backgroundColor: stageBg },
                          ]}
                        >
                          <Ionicons name="moon" size={18} color={stageColor} />
                        </View>

                        <View style={{ flex: 1, gap: 4 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.historyItemDate}>
                              {formatDateLabel(item.date)}
                            </Text>
                            <View
                              style={[
                                styles.sleepBadgeSmall,
                                { backgroundColor: stageBg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sleepBadgeSmallText,
                                  { color: stageColor },
                                ]}
                              >
                                {stageLabel}
                              </Text>
                            </View>
                          </View>

                          {/* Mini Progress Bar */}
                          <View style={styles.historyMiniProgressBg}>
                            <View
                              style={[
                                styles.historyMiniProgressFill,
                                {
                                  width: `${percent}%`,
                                  backgroundColor: stageColor,
                                },
                              ]}
                            />
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.historyItemMainVal}>
                              {h}h {m > 0 ? `${m}m` : ""}
                              <Text style={styles.historyItemSubUnit}>
                                {" "}
                                ({hrs} hrs)
                              </Text>
                            </Text>
                            <Text style={styles.historyItemSubInfo}>
                              Goal: 8.0h ({percent}%)
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {sortedSleepHistory.length > 3 && (
                    <TouchableOpacity
                      style={styles.expandToggleFooter}
                      onPress={() => setIsSleepHistoryExpanded((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.expandToggleFooterText,
                          { color: "#6366F1" },
                        ]}
                      >
                        {isSleepHistoryExpanded
                          ? "Show Less"
                          : `View All ${sortedSleepHistory.length} Logs`}
                      </Text>
                      <Ionicons
                        name={
                          isSleepHistoryExpanded ? "chevron-up" : "chevron-down"
                        }
                        size={14}
                        color="#6366F1"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── 4. WATER HYDRATION VIEW ── */}
        {activeTab === "water" && (
          <View style={styles.tabContentCol}>
            {/* Water Hydration Tracker Widget */}
            <WaterTrackerWidget
              waterAmount={waterAmount}
              onAddWater={handleWaterAdd}
              onResetWater={handleWaterReset}
              onOpenHistory={() => setIsWaterHistoryExpanded((prev) => !prev)}
            />

            {/* 3 Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Ionicons name="water-outline" size={20} color="#2563EB" />
                <Text style={styles.metricValue}>
                  {waterAmount.toFixed(2)} L
                </Text>
                <Text style={styles.metricLabel}>Logged</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="flag-outline" size={20} color="#059669" />
                <Text style={styles.metricValue}>2.75 L</Text>
                <Text style={styles.metricLabel}>Target</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="hourglass-outline" size={20} color="#D97706" />
                <Text style={styles.metricValue}>
                  {Math.max(0, parseFloat((2.75 - waterAmount).toFixed(2)))} L
                </Text>
                <Text style={styles.metricLabel}>Remaining</Text>
              </View>
            </View>

            {/* Motivational Banner */}
            <View
              style={[
                styles.motivationalCard,
                { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
              ]}
            >
              <View
                style={[
                  styles.motivationalIconBg,
                  { backgroundColor: "#DBEAFE" },
                ]}
              >
                <Ionicons name="water" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.motivationalTitle, { color: "#1E40AF" }]}>
                  Stay Hydrated
                </Text>
                <Text style={[styles.motivationalSub, { color: "#1D4ED8" }]}>
                  Drinking water consistently supports metabolism, energy
                  levels, and joint recovery.
                </Text>
              </View>
            </View>

            {/* ── WATER HISTORY SECTION ── */}
            <View style={styles.historySectionCard}>
              <View style={styles.historyHeaderRow}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  activeOpacity={0.7}
                  onPress={() => setIsWaterHistoryExpanded((prev) => !prev)}
                >
                  <View
                    style={[
                      styles.historySectionIconWrap,
                      { backgroundColor: "#EFF6FF" },
                    ]}
                  >
                    <Ionicons name="water" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.historySectionTitle}>
                    Hydration History
                  </Text>
                  <View
                    style={[
                      styles.historyChevronBtn,
                      { backgroundColor: "#EFF6FF" },
                    ]}
                  >
                    <Ionicons
                      name={
                        isWaterHistoryExpanded ? "chevron-up" : "chevron-down"
                      }
                      size={18}
                      color="#2563EB"
                    />
                  </View>
                </TouchableOpacity>
                <View
                  style={[
                    styles.historyCountPill,
                    { backgroundColor: "#EFF6FF" },
                  ]}
                >
                  <Text
                    style={[styles.historyCountPillText, { color: "#2563EB" }]}
                  >
                    {sortedWaterHistory.length}{" "}
                    {sortedWaterHistory.length === 1 ? "Log" : "Logs"}
                  </Text>
                </View>
              </View>

              {sortedWaterHistory.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Ionicons name="water-outline" size={32} color="#94A3B8" />
                  <Text style={styles.emptyHistoryTitle}>
                    No Hydration Logs Yet
                  </Text>
                  <Text style={styles.emptyHistorySubtitle}>
                    Tap "+0.25L" or "+0.5L" above to record your daily water
                    intake.
                  </Text>
                </View>
              ) : (
                <View style={styles.historyListCol}>
                  {displayedWaterHistory.map((item, idx) => {
                    const amt = item.amount ?? 0;
                    const target = 2.75;
                    const percent = Math.min(
                      100,
                      Math.round((amt / target) * 100),
                    );
                    const isGoalReached = amt >= target;
                    const badgeColor = isGoalReached ? "#059669" : "#2563EB";
                    const badgeBg = isGoalReached ? "#ECFDF5" : "#EFF6FF";
                    const badgeLabel = isGoalReached
                      ? "Goal Reached"
                      : `${percent}% Target`;

                    return (
                      <View key={idx} style={styles.historyItemRow}>
                        <View
                          style={[
                            styles.historyItemIconBg,
                            { backgroundColor: badgeBg },
                          ]}
                        >
                          <Ionicons
                            name={isGoalReached ? "checkmark-circle" : "water"}
                            size={18}
                            color={badgeColor}
                          />
                        </View>

                        <View style={{ flex: 1, gap: 4 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.historyItemDate}>
                              {formatDateLabel(item.date)}
                            </Text>
                            <View
                              style={[
                                styles.sleepBadgeSmall,
                                { backgroundColor: badgeBg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sleepBadgeSmallText,
                                  { color: badgeColor },
                                ]}
                              >
                                {badgeLabel}
                              </Text>
                            </View>
                          </View>

                          {/* Mini Progress Bar */}
                          <View style={styles.historyMiniProgressBg}>
                            <View
                              style={[
                                styles.historyMiniProgressFill,
                                {
                                  width: `${percent}%`,
                                  backgroundColor: badgeColor,
                                },
                              ]}
                            />
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.historyItemMainVal}>
                              {amt.toFixed(2)} L
                              <Text style={styles.historyItemSubUnit}>
                                {" "}
                                (~{Math.round(amt * 4)} glasses)
                              </Text>
                            </Text>
                            <Text style={styles.historyItemSubInfo}>
                              Goal: {target}L ({percent}%)
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {sortedWaterHistory.length > 3 && (
                    <TouchableOpacity
                      style={styles.expandToggleFooter}
                      onPress={() => setIsWaterHistoryExpanded((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.expandToggleFooterText,
                          { color: "#2563EB" },
                        ]}
                      >
                        {isWaterHistoryExpanded
                          ? "Show Less"
                          : `View All ${sortedWaterHistory.length} Logs`}
                      </Text>
                      <Ionicons
                        name={
                          isWaterHistoryExpanded ? "chevron-up" : "chevron-down"
                        }
                        size={14}
                        color="#2563EB"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Log Today's Weight Modal with Image Upload */}
      <Modal visible={showWeightModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.weightModalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSubHeader}>WEIGHT MANAGEMENT</Text>
                <Text style={styles.modalTitle}>Log Today's Weight</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowWeightModal(false);
                  setWeightImageUri(null);
                }}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Weight Input */}
            <Text style={styles.inputLabel}>Weight (kg)</Text>
            <View style={styles.modalInputRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="72.4"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={newWeight}
                onChangeText={setNewWeight}
                autoFocus
              />
              <Text style={styles.modalUnitText}>kg</Text>
            </View>

            {/* Upload Image Option */}
            <Text style={styles.inputLabel}>
              Progress Photo{" "}
              <Text style={{ color: "#94A3B8", fontWeight: "400" }}>
                (optional)
              </Text>
            </Text>

            {weightImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: weightImageUri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setWeightImageUri(null)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.uploadedBadgeText}>Photo selected</Text>
                </View>
              </View>
            ) : isUploadingPhoto ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator color="#059669" size="small" />
                <Text style={styles.uploadingText}>Uploading photo...</Text>
              </View>
            ) : (
              <View style={styles.photoPickerRow}>
                <TouchableOpacity
                  style={styles.pickPhotoBtn}
                  onPress={handlePickGallery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={18} color="#059669" />
                  <Text style={styles.pickPhotoBtnText}>Choose Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickPhotoBtn}
                  onPress={handlePickCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={18} color="#059669" />
                  <Text style={styles.pickPhotoBtnText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Note (Optional) */}
            <Text style={styles.inputLabel}>
              Note{" "}
              <Text style={{ color: "#94A3B8", fontWeight: "400" }}>
                (optional)
              </Text>
            </Text>
            <TextInput
              style={styles.modalNoteInput}
              placeholder="e.g. Morning weighing after workout"
              placeholderTextColor="#94A3B8"
              value={weightNote}
              onChangeText={setWeightNote}
            />

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowWeightModal(false);
                  setWeightImageUri(null);
                }}
                disabled={isUploadingPhoto}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  isUploadingPhoto && { opacity: 0.7 },
                ]}
                onPress={handleSaveWeight}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  calendarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  toggleBtnTextActive: {
    color: "#0A8554",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  timePillsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  timePill: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  timePillActive: {
    backgroundColor: "#0A8554",
    shadowColor: "#0A8554",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  timePillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  timePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  weightTabCol: {
    gap: 18,
  },
  actionCardWrap: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginTop: -14,
  },
  actionCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  actionCameraIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardTextCol: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  rangePillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    padding: 3,
    borderRadius: 10,
  },
  rangePillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  rangePillBtnActive: {
    backgroundColor: "#0A8554",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  rangePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  rangePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  choiceModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    gap: 12,
  },
  choiceModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  choiceModalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 6,
  },
  choiceOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  choiceOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  choiceOptionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  choiceCancelBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    marginTop: 4,
  },
  choiceCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  tabContentCol: {
    gap: 16,
  },
  heroGaugeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  gaugeArcCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 10,
    borderColor: "#0A8554",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gaugeArcContainer: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gaugeArcInnerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleMiniIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gaugeBigValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  gaugeUnitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  gaugeSublabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  stepsGoalText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  diffBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A8554",
  },
  diffMutedText: {
    fontSize: 12,
    color: "#64748B",
  },
  progressBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#0A8554",
    borderRadius: 4,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  actionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  motivationalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 12,
  },
  motivationalIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  motivationalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  motivationalSub: {
    fontSize: 12,
    color: "#047857",
  },
  sleepBreakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  sleepStageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  stageDuration: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 12,
  },
  stagePercent: {
    fontSize: 13,
    color: "#64748B",
    width: 36,
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  weightModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 360,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 320,
    gap: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalSubHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 50,
  },
  modalInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalUnitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  photoPickerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  pickPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  pickPhotoBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  imagePreviewContainer: {
    marginTop: 6,
    marginBottom: 6,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  imagePreview: {
    width: "100%",
    height: 130,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 14,
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ECFDF5",
    borderTopWidth: 1,
    borderTopColor: "#D1FAE5",
  },
  uploadedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  uploadingText: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
  },
  modalNoteInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 46,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0A8554",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* History Section Card Styles */
  historySectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 14,
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historySectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  historyCountPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyCountPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A8554",
  },
  emptyHistoryBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 6,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  emptyHistorySubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 240,
  },
  historyListCol: {
    gap: 10,
  },
  historyItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  historyItemIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  historyItemMainVal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  historyItemSubUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  historyMiniProgressBg: {
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  historyMiniProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  historyItemSubInfo: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  historyGoalTag: {
    fontSize: 11,
    fontWeight: "700",
  },
  sleepBadgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sleepBadgeSmallText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  historyChevronBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  expandToggleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginTop: 2,
  },
  expandToggleFooterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0A8554",
  },
});
