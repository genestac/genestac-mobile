import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe'; // npm install react-native-youtube-iframe (uses your existing react-native-webview under the hood, no native rebuild needed)
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_EXERCISE_PLAN = {
  monday: {
    type: "Full Body Warm-up & Cardio",
    exercises: [
      {
        name: "Brisk Walking (Tez Chalna)",
        sets: 1,
        duration: "20 mins"
      },
      {
        name: "Jumping Jacks",
        reps: 15,
        sets: 3
      },
      {
        name: "Stretching",
        sets: 1,
        duration: "5 mins"
      }
    ],
    duration_minutes: 30
  },
  tuesday: {
    type: "Lower Body & Core",
    exercises: [
      {
        name: "Bodyweight Squats (Uthak Baithak)",
        reps: 15,
        sets: 3
      },
      {
        name: "Lunges",
        reps: "10 per leg",
        sets: 3
      },
      {
        name: "Plank",
        sets: 3,
        duration: "30 seconds"
      }
    ],
    duration_minutes: 30
  },
  wednesday: {
    type: "Yoga & Flexibility",
    exercises: [
      {
        name: "Surya Namaskar (Sun Salutation)",
        reps: "Full cycle",
        sets: 5
      },
      {
        name: "Bhujangasana (Cobra Pose)",
        sets: 3,
        duration: "30 seconds"
      },
      {
        name: "Anulom Vilom (Breathing Exercise)",
        sets: 1,
        duration: "10 mins"
      }
    ],
    duration_minutes: 40
  },
  thursday: {
    type: "Upper Body Strength",
    exercises: [
      {
        name: "Push-ups (Knee push-ups if beginner)",
        reps: 10,
        sets: 3
      },
      {
        name: "Arm Circles",
        sets: 3,
        duration: "30 seconds"
      },
      {
        name: "Wall Push-ups",
        reps: 15,
        sets: 3
      }
    ],
    duration_minutes: 30
  },
  friday: {
    type: "Active Fat Burn",
    exercises: [
      {
        name: "Spot Jogging (Running in place)",
        sets: 3,
        duration: "2 mins"
      },
      {
        name: "High Knees",
        sets: 3,
        duration: "30 seconds"
      },
      {
        name: "Bicycle Crunches",
        reps: 20,
        sets: 3
      }
    ],
    duration_minutes: 35
  },
  saturday: {
    type: "Long Walk / Outdoor Activity",
    exercises: [
      {
        name: "Morning or Evening Walk in the Park",
        sets: 1,
        notes: "Try to walk continuously at a good pace.",
        duration: "45 mins"
      }
    ],
    duration_minutes: 45
  },
  sunday: {
    type: "Rest Day",
    exercises: [
      {
        name: "Complete Rest",
        sets: 1,
        notes: "Give your body time to recover. Drink plenty of water.",
        duration: "0 mins"
      }
    ],
    duration_minutes: 0
  }
};

interface ParsedExercise {
  id: string;
  name: string;
  setsReps?: string;
  category?: string;
  notes?: string;
  details?: string[];
  instructions?: string[];
  videoUrl?: string; // optional explicit video link coming from dynamic/custom plan data
}

// ---------------------------------------------------------------------------
// Curated, verified exercise videos. Each videoId points at a real YouTube
// tutorial (checked via web search) so the in-app player always has real
// content instead of a broken/guessed link.
// ---------------------------------------------------------------------------
const EXERCISE_VIDEO_MAP: Record<string, { videoId: string; image: string; cues: string[] }> = {
  walking: {
    videoId: "fxoVqhZvRLg", // How to do Brisk Walking at Home (MFine)
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Running_Treadmill/0.jpg",
    cues: [
      "Maintain a steady, comfortable walking pace.",
      "Keep posture upright and shoulders relaxed.",
      "Swing arms rhythmically in opposition to legs."
    ]
  },
  jack: {
    videoId: "aknTmegKiIg", // Jumping Jacks Exercise Tutorial
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
    cues: [
      "Stand upright with feet together and hands by your side.",
      "Jump feet outward while raising arms above your head.",
      "Land softly on the balls of your feet and return to start position."
    ]
  },
  stretch: {
    videoId: "Ef6LwAaB3_E", // 5 Min Daily Stretch - full body routine
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg",
    cues: [
      "Move smoothly into the stretch without bouncing.",
      "Hold for 15-30 seconds taking deep, relaxing breaths.",
      "Keep movement gentle and within pain-free range."
    ]
  },
  squat: {
    videoId: "ZLJBfYF_oO0", // Bodyweight Squat: How To (3 steps to proper form)
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
    cues: [
      "Keep feet shoulder-width apart, toes slightly turned out.",
      "Push hips back and bend knees until thighs are parallel to floor.",
      "Keep chest up and knees tracking over toes without caving in.",
      "Drive through your heels to return to standing position."
    ]
  },
  lunge: {
    videoId: "J1khP9Xug0o", // Proper Lunge Form (NASM trainer tip)
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Walking_Lunge/0.jpg",
    cues: [
      "Step forward with one leg, bending both knees to 90 degrees.",
      "Keep front knee directly above ankle, not past toes.",
      "Keep torso upright and core engaged.",
      "Push back through front heel to return standing."
    ]
  },
  plank: {
    videoId: "mwlp75MS6Rg", // How to do a Plank | NASM
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
    cues: [
      "Forearms on floor with elbows directly under shoulders.",
      "Engage core and glutes to keep body in a neutral straight line.",
      "Avoid letting hips sag down or piking up.",
      "Breathe steadily throughout the hold duration."
    ]
  },
  surya: {
    videoId: "1xRX1MuoImw", // Step by Step Surya Namaskar for Beginners
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg",
    cues: [
      "Move fluently between poses with steady inhalation and exhalation.",
      "Maintain neutral spine alignment throughout all 12 postures.",
      "Listen to your body and avoid forcing deep stretches."
    ]
  },
  bhujangasana: {
    videoId: "0biEZdwqKwA", // Mastering Bhujangasana - Step-by-step guide to Cobra Pose
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg",
    cues: [
      "Lie face down, palms under shoulders.",
      "Inhale deeply and gently lift chest off the mat.",
      "Keep elbows close to torso and shoulders relaxed down."
    ]
  },
  anulom: {
    videoId: "eo9zBovLsfI", // Anulom Vilom Pranayama - How to Do Step by Step for Beginners
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cat_Stretch/0.jpg",
    cues: [
      "Sit upright with spine relaxed in a comfortable cross-legged position.",
      "Close right nostril with thumb and inhale slowly through left nostril.",
      "Close left nostril, open right nostril and exhale completely.",
      "Repeat alternate breathing continuously for 5-10 minutes."
    ]
  },
  push: {
    videoId: "WDIpL0pjun0", // How to do a Push-Up | NASM
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg",
    cues: [
      "Place hands slightly wider than shoulder-width apart.",
      "Keep body in a straight line from head to heels (or knees).",
      "Lower your chest until it nearly touches the floor.",
      "Exhale and push back up smoothly to starting position."
    ]
  },
  arm: {
    videoId: "hne3nHGXPRM", // Arm Circles (Exercise Library) - step-by-step
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
    cues: [
      "Extend arms out to sides at shoulder height.",
      "Make small controlled circular motions forward then backward.",
      "Keep core engaged and shoulders relaxed."
    ]
  },
  wall: {
    videoId: "dhjjqFfUVlg", // Wall Pushup - proper form demo
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg",
    cues: [
      "Stand an arm's length from the wall, feet shoulder-width apart.",
      "Place hands on the wall at chest height, slightly wider than shoulders.",
      "Bend elbows to bring chest toward the wall, then push back to start.",
      "Keep body in one straight line throughout the movement."
    ]
  },
  jog: {
    videoId: "xmkYBO85leM", // How to Jog in Place - Exercise Demonstration
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Running_Treadmill/0.jpg",
    cues: [
      "Jog lightly in place with soft landings on balls of feet.",
      "Keep shoulders relaxed and arms swinging at 90 degrees.",
      "Breathe rhythmically throughout."
    ]
  },
  knee: {
    videoId: "QIwxSeKpHtI", // How to perform High Knees
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Running_Treadmill/0.jpg",
    cues: [
      "Run in place driving knees up towards hip height.",
      "Pump arms rhythmically with opposite legs.",
      "Keep chest up and core tight.",
      "Land softly on the balls of your feet."
    ]
  },
  crunch: {
    videoId: "wpRI3xBhJmo", // How To Do A Bicycle Crunch | The Right Way | Well+Good
    image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg",
    cues: [
      "Lie on back with knees bent and feet flat on floor.",
      "Place hands gently behind head or crossed over chest.",
      "Contract abdominal muscles to lift shoulders 3–4 inches off floor.",
      "Lower back down under control without yanking on your neck."
    ]
  }
};

const DEFAULT_FALLBACK = {
  videoId: "Ef6LwAaB3_E",
  image: "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bodyweight_Squat/0.jpg",
  cues: [
    "Perform movement smoothly with controlled form.",
    "Inhale on preparation, exhale during exertion.",
    "Rest 60-90s between sets for muscle recovery."
  ]
};

// Extracts a YouTube video ID from common URL shapes. Returns null for
// anything that isn't a single-video link (e.g. a search-results page),
// so we never try to embed something that isn't actually a video.
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{6,})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m && m[1]) return m[1];
    }
  } catch (e) {
    return null;
  }
  return null;
}

function getExerciseVideoAndCues(exercise: ParsedExercise) {
  const nameLower = exercise.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cuesOverride = exercise.instructions && exercise.instructions.length > 0 ? exercise.instructions : undefined;

  // 1. If the plan data itself provides a video link, prefer that.
  if (exercise.videoUrl) {
    const directId = extractYouTubeId(exercise.videoUrl);
    if (directId) {
      // Try to also find a matching image/cue set for nicer fallback visuals.
      const matched = Object.entries(EXERCISE_VIDEO_MAP).find(([key]) => nameLower.includes(key));
      return {
        videoId: directId,
        externalUrl: null as string | null,
        image: matched ? matched[1].image : DEFAULT_FALLBACK.image,
        cues: cuesOverride || (matched ? matched[1].cues : DEFAULT_FALLBACK.cues),
      };
    }
    // Not a directly embeddable link (e.g. a YouTube search results URL) -
    // don't try to embed it, offer it as an external "open" link instead.
    const matched = Object.entries(EXERCISE_VIDEO_MAP).find(([key]) => nameLower.includes(key));
    return {
      videoId: matched ? matched[1].videoId : null,
      externalUrl: exercise.videoUrl,
      image: matched ? matched[1].image : DEFAULT_FALLBACK.image,
      cues: cuesOverride || (matched ? matched[1].cues : DEFAULT_FALLBACK.cues),
    };
  }

  // 2. Otherwise match against our curated, verified video library.
  for (const [key, val] of Object.entries(EXERCISE_VIDEO_MAP)) {
    if (nameLower.includes(key)) {
      return {
        videoId: val.videoId,
        externalUrl: null,
        image: val.image,
        cues: cuesOverride || val.cues,
      };
    }
  }

  // 3. Last resort: generic fallback video so something always plays.
  return {
    videoId: DEFAULT_FALLBACK.videoId,
    externalUrl: null,
    image: DEFAULT_FALLBACK.image,
    cues: cuesOverride || DEFAULT_FALLBACK.cues,
  };
}

function formatExerciseItem(item: any, fallbackName: string = 'Exercise'): ParsedExercise {
  if (item === null || item === undefined) {
    return { id: Math.random().toString(), name: fallbackName };
  }

  if (typeof item === 'string' || typeof item === 'number') {
    return { id: Math.random().toString(), name: String(item) };
  }

  if (Array.isArray(item)) {
    const formattedList = item
      .map(i => (typeof i === 'object' && i !== null ? formatExerciseItem(i).name : String(i)))
      .filter(Boolean);
    return {
      id: Math.random().toString(),
      name: formattedList[0] || fallbackName,
      details: formattedList.length > 1 ? formattedList.slice(1) : undefined,
    };
  }

  if (typeof item === 'object') {
    const nameCandidates = [
      item.name, item.title, item.exercise, item.workout, item.activity,
      item.name_of_exercise, item.exercise_name, item.text, item.description
    ];

    let exName: string | undefined;
    for (const cand of nameCandidates) {
      if (cand && typeof cand === 'string') {
        exName = cand;
        break;
      } else if (cand && typeof cand === 'number') {
        exName = String(cand);
        break;
      }
    }

    const sets = item.sets ? (typeof item.sets === 'number' ? `${item.sets} sets` : item.sets) : '';
    const reps = item.reps ? (typeof item.reps === 'number' ? `${item.reps} reps` : item.reps) : '';
    const duration = item.duration || item.time || item.length;
    const weight = item.weight || item.load;

    let setsReps: string | undefined;
    if (sets && reps) setsReps = `${sets} × ${reps}`;
    else if (sets) setsReps = sets;
    else if (reps) setsReps = reps;
    else if (duration) setsReps = typeof duration === 'number' ? `${duration} mins` : String(duration);

    if (weight) {
      setsReps = setsReps ? `${setsReps} (${weight})` : String(weight);
    }

    const category = item.category || item.type || item.group || item.target || item.muscle;
    const notes = item.notes || item.instructions || (item.rest ? `Rest: ${item.rest}` : undefined);

    // Pick up an explicit video field from dynamic/custom plan data, if present.
    const videoUrl = item.video || item.videoUrl || item.video_url || item.youtube || item.youtubeUrl;

    let details: string[] | undefined;
    if (Array.isArray(item.items) || Array.isArray(item.steps) || Array.isArray(item.exercises)) {
      const list = item.items || item.steps || item.exercises;
      details = list.map((sub: any) => (typeof sub === 'object' && sub !== null ? formatExerciseItem(sub).name : String(sub)));
    }

    if (!exName) {
      const entries = Object.entries(item)
        .filter(([k, v]) => v !== null && v !== undefined && typeof v !== 'function')
        .map(([k, v]) => {
          const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
          const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return `${formattedKey}: ${valStr}`;
        });

      if (entries.length > 0) {
        exName = entries[0];
        if (entries.length > 1 && !details) {
          details = entries.slice(1);
        }
      } else {
        exName = fallbackName;
      }
    }

    return {
      id: item.id || Math.random().toString(),
      name: exName,
      setsReps: setsReps || (typeof item.setsReps === 'string' ? item.setsReps : undefined),
      category: typeof category === 'string' ? category : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
      details,
      videoUrl: typeof videoUrl === 'string' ? videoUrl : undefined,
    };
  }

  return { id: Math.random().toString(), name: String(item) };
}

function getDayPlan(plan: any, day: string): any {
  if (!plan || typeof plan !== 'object') return null;
  const dayLower = day.toLowerCase();
  const dayShort = dayLower.slice(0, 3);

  for (const key of Object.keys(plan)) {
    const k = key.toLowerCase();
    if (k === dayLower || k === dayShort) {
      return plan[key];
    }
  }
  return null;
}

function parseExercises(dayPlan: any): ParsedExercise[] {
  if (!dayPlan) return [];

  if (Array.isArray(dayPlan)) {
    return dayPlan.map((item, index) => formatExerciseItem(item, `Exercise ${index + 1}`));
  }

  if (typeof dayPlan === 'object') {
    const arrayKey = ['exercises', 'workout', "items", "routines", "list"].find(k => Array.isArray(dayPlan[k]));
    if (arrayKey && Array.isArray(dayPlan[arrayKey])) {
      return dayPlan[arrayKey].map((item: any, index: number) => formatExerciseItem(item, `Exercise ${index + 1}`));
    }

    const result: ParsedExercise[] = [];
    Object.entries(dayPlan).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') return;

      if (Array.isArray(val)) {
        val.forEach((subItem, subIdx) => {
          const formatted = formatExerciseItem(subItem, `${key} ${subIdx + 1}`);
          if (!formatted.category) formatted.category = key.replace(/_/g, ' ');
          result.push(formatted);
        });
      } else if (typeof val === 'object') {
        const formatted = formatExerciseItem(val, key.replace(/_/g, ' '));
        result.push(formatted);
      } else {
        result.push({
          id: key,
          name: key.length > 2 && isNaN(Number(key)) ? `${key.replace(/_/g, ' ')}: ${String(val)}` : String(val),
        });
      }
    });

    return result;
  }

  if (typeof dayPlan === 'string') {
    const lines = dayPlan.split(/\n|;/).map(l => l.trim()).filter(Boolean);
    return lines.map((line, idx) => ({
      id: `ex-${idx}`,
      name: line,
    }));
  }

  return [];
}

function ExerciseFormModal({
  exercise,
  onClose,
}: {
  exercise: ParsedExercise | null;
  onClose: () => void;
}) {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [mediaWidth, setMediaWidth] = useState(0);

  // Reset player state whenever a new exercise is opened.
  useEffect(() => {
    if (exercise) {
      setVideoLoading(true);
      setVideoError(false);
    }
  }, [exercise?.id]);

  if (!exercise) return null;

  const { videoId, externalUrl, image, cues } = getExerciseVideoAndCues(exercise);

  return (
    <Modal
      visible={!!exercise}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          <View style={s.modalHandleBar} />

          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>{exercise.name}</Text>
              {exercise.setsReps ? (
                <View style={s.badgeRow}>
                  <Ionicons name="repeat-outline" size={14} color={Colors.primaryLight} />
                  <Text style={s.setsRepsText}>{exercise.setsReps}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalScrollContent} showsVerticalScrollIndicator={false}>
            {/* Real in-app video player */}
            <View style={s.mediaBox} onLayout={(e) => setMediaWidth(e.nativeEvent.layout.width)}>
              {videoId && !videoError && mediaWidth === 0 ? (
                // Still measuring the container on first render — show a
                // spinner rather than flashing the fallback image.
                <View style={s.mediaLoader}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                </View>
              ) : videoId && !videoError ? (
                <>
                  <YoutubePlayer
                    key={exercise.id}
                    height={220}
                    width={mediaWidth}
                    videoId={videoId}
                    play={false}
                    onReady={() => setVideoLoading(false)}
                    onError={(error: string) => {
                      // react-native-youtube-iframe reports 'embed_not_allowed',
                      // 'video_not_found', etc. Any of these mean we can't play
                      // it in-app, so fall back to the external open link
                      // rather than leaving a dead player on screen.
                      setVideoError(true);
                      setVideoLoading(false);
                    }}
                    webViewProps={{ allowsInlineMediaPlayback: true }}
                  />
                  {videoLoading && (
                    <View style={s.mediaLoader} pointerEvents="none">
                      <ActivityIndicator color={Colors.primary} size="large" />
                    </View>
                  )}
                  <View style={s.liveBadge}>
                    <View style={s.liveDot} />
                    <Text style={s.liveBadgeText}>VIDEO FORM GUIDE</Text>
                  </View>
                </>
              ) : (
                <>
                  <Image source={{ uri: image }} style={s.mediaVideo} resizeMode="cover" />
                  {(() => {
                    // Prefer an explicit external link; otherwise, if we at least
                    // know a videoId, build a normal watch link so the user can
                    // still open it (this covers the case where the in-app
                    // player failed, e.g. embedding disabled for that video).
                    const fallbackLink = externalUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);
                    return fallbackLink ? (
                      <TouchableOpacity
                        style={s.openExternalBtn}
                        onPress={() => Linking.openURL(fallbackLink)}
                      >
                        <Ionicons name="open-outline" size={16} color={Colors.white} />
                        <Text style={s.openExternalBtnText}>Open Video in YouTube</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={s.liveBadge}>
                        <Text style={s.liveBadgeText}>FORM GUIDE</Text>
                      </View>
                    );
                  })()}
                </>
              )}
            </View>

            {/* Step-by-Step Form Instructions */}
            <View style={s.cuesSection}>
              <View style={s.cuesHeader}>
                <Ionicons name="fitness-outline" size={18} color={Colors.primary} />
                <Text style={s.cuesTitle}>Step-by-Step Form Cues</Text>
              </View>

              {cues.map((cue, idx) => (
                <View key={idx} style={s.cueRow}>
                  <View style={s.cueBadge}>
                    <Text style={s.cueBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={s.cueText}>{cue}</Text>
                </View>
              ))}

              {exercise.notes ? (
                <View style={s.modalNotesCard}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.primaryLight} />
                  <Text style={s.modalNotesText}>{exercise.notes}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={s.doneBtn} onPress={onClose}>
              <Text style={s.doneBtnText}>Got it, Back to Workout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ExerciseScreen() {
  const [exercisePlan, setExercisePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const [selectedDay, setSelectedDay] = useState(today);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error: e } = await supabase.from('user_plans').select('exercise_plan').eq('user_id', session.user.id).single();
        if (!e && data?.exercise_plan && Object.keys(data.exercise_plan).length > 0) {
          setExercisePlan(data.exercise_plan);
          setLoading(false);
          return;
        }
      }
      setExercisePlan(DEFAULT_EXERCISE_PLAN);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <SafeAreaView style={s.center} edges={["top", "left", "right"]}><ActivityIndicator color={Colors.primaryLight} size="large" /></SafeAreaView>;

  const dayPlan = getDayPlan(exercisePlan, selectedDay);
  const exercises = parseExercises(dayPlan);
  const dayType = typeof dayPlan === 'object' && dayPlan?.type ? dayPlan.type : null;

  return (
    <SafeAreaView style={s.flex} edges={["top", "left", "right"]}>
      <ScrollView style={s.flex} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIcon}><Ionicons name="barbell" size={22} color={Colors.white} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Exercise Plan</Text>
            <Text style={s.subtitle}>Your weekly workout plan</Text>
          </View>
        </View>

        {/* Day Selector */}
        {exercisePlan && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayScroll}>
            {DAYS.map(d => {
              const active = selectedDay === d;
              return (
                <TouchableOpacity key={d} style={[s.dayBtn, active && s.dayBtnActive]} onPress={() => setSelectedDay(d)}>
                  <Text style={[s.dayBtnText, active && s.dayBtnTextActive]}>{d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)}</Text>
                  {d === today && <View style={[s.todayDot, active && { backgroundColor: Colors.white }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Content */}
        {exercises.length === 0 || selectedDay === 'sunday' ? (
          <View style={s.emptyState}>
            <Ionicons name="bed-outline" size={48} color={Colors.textLight} />
            <Text style={s.emptyTitle}>Rest Day 🛌</Text>
            <Text style={s.emptyText}>Give your body time to recover. Drink plenty of water and rest well!</Text>
          </View>
        ) : (
          <View style={s.exerciseList}>
            <View style={s.dayHeaderRow}>
              <Text style={s.dayHeader}>{selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s Workout</Text>
              {dayType ? (
                <View style={s.dayTypeBadge}>
                  <Text style={s.dayTypeText}>{dayType}</Text>
                </View>
              ) : null}
            </View>

            {exercises.map((ex, i) => (
              <View key={ex.id || i} style={s.exerciseCard}>
                <View style={s.exerciseNum}>
                  <Text style={s.exerciseNumText}>{i + 1}</Text>
                </View>

                <View style={s.exerciseInfo}>
                  <View style={s.titleRow}>
                    <Text style={s.exerciseName}>{ex.name}</Text>
                    {ex.category ? (
                      <View style={s.categoryTag}>
                        <Text style={s.categoryText}>{ex.category}</Text>
                      </View>
                    ) : null}
                  </View>

                  {ex.setsReps ? (
                    <View style={s.badgeRow}>
                      <Ionicons name="repeat-outline" size={14} color={Colors.primaryLight} />
                      <Text style={s.setsRepsText}>{ex.setsReps}</Text>
                    </View>
                  ) : null}

                  {ex.notes ? <Text style={s.notesText}>{ex.notes}</Text> : null}

                  {ex.details && ex.details.length > 0 ? (
                    <View style={s.detailsBox}>
                      {ex.details.map((d, idx) => (
                        <Text key={idx} style={s.detailText}>• {d}</Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  headerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },
  dayScroll: { gap: 6, paddingVertical: 4 },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 2 },
  dayBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryLight },
  dayBtnText: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textMuted },
  dayBtnTextActive: { color: Colors.white },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primaryLight },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  exerciseList: { gap: 10 },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  dayHeader: { fontSize: Fonts.sizes.md, fontWeight: '800', color: Colors.textPrimary },
  dayTypeBadge: { backgroundColor: Colors.primaryMuted, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  dayTypeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  exerciseCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  exerciseNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  exerciseNumText: { fontSize: Fonts.sizes.xs, fontWeight: '800', color: Colors.primary },
  exerciseInfo: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  exerciseName: { fontSize: Fonts.sizes.sm, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  categoryTag: { backgroundColor: Colors.primaryMuted, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  categoryText: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'capitalize' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  setsRepsText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.primaryLight },
  notesText: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, fontStyle: 'italic', marginTop: 1 },
  detailsBox: { marginTop: 4, gap: 2 },
  detailText: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },

  // In-App Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 23, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
    height: '80%',
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '600',
    color: Colors.primaryLight,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBox: {
    height: 220,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
    position: 'relative',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  mediaLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(11, 107, 84, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  openExternalBtn: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(11, 107, 84, 0.92)',
    paddingVertical: 10,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openExternalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  cuesSection: {
    gap: 10,
    marginBottom: 16,
  },
  cuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cuesTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: Radius.md,
  },
  cueBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
  },
  cueText: {
    flex: 1,
    fontSize: Fonts.sizes.xs,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  modalNotesCard: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.md,
    padding: 10,
    marginTop: 4,
  },
  modalNotesText: {
    flex: 1,
    fontSize: Fonts.sizes.xs,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  doneBtnText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '800',
    color: Colors.white,
  },
});