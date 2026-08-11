import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface ScenarioOption {
  text: string;
  isHealthy: boolean;
  feedback: string;
  points: number;
}

export interface Scenario {
  id: number;
  question: string;
  avatarEmoji: string;
  options: ScenarioOption[];
}

const DB_TABLE_KEY = '@genestac_hanger_scenarios_db_v1';
let sqliteDb: any = null;
let sqliteAttempted = false;

async function getSqliteDB() {
  if (sqliteDb) return sqliteDb;
  if (sqliteAttempted) return null;

  sqliteAttempted = true;
  try {
    const { NativeModules, Platform } = require('react-native');
    if (Platform.OS === 'web') return null;

    // Check if the native ExpoSQLite binary module is available in current runtime
    const expoModules = (globalThis as any)?.ExpoModules;
    const hasExpoSQLite = Boolean(
      expoModules?.ExpoSQLite ||
      NativeModules?.ExpoSQLite ||
      NativeModules?.ExponentSQLite
    );

    if (!hasExpoSQLite) {
      // Running in standard Expo Go without native ExpoSQLite build linked
      return null;
    }

    const SQLite = require('expo-sqlite');
    if (SQLite && typeof SQLite.openDatabaseAsync === 'function') {
      try {
        sqliteDb = await SQLite.openDatabaseAsync('genestac_scenarios.db');
        await sqliteDb.execAsync(`
          CREATE TABLE IF NOT EXISTS hanger_scenarios (
            id INTEGER PRIMARY KEY NOT NULL,
            question TEXT NOT NULL,
            avatar_emoji TEXT NOT NULL,
            options_json TEXT NOT NULL
          );
        `);
        return sqliteDb;
      } catch (openError) {
        sqliteDb = null;
        return null;
      }
    }
  } catch (e) {
    sqliteDb = null;
  }
  return null;
}

// Seed Database with 32 comprehensive, engaging scenarios
export const SEED_SCENARIOS: Scenario[] = [
  {
    id: 1,
    question: "It's 3 PM at work and your stomach growls like a monster. What do you reach for?",
    avatarEmoji: '🤬',
    options: [
      { text: 'A) Handful of almonds & a green apple', isHealthy: true, feedback: 'Pro choice! Fiber + healthy fats stabilized your blood sugar!', points: 25 },
      { text: 'B) Large frosted donut & double espresso', isHealthy: false, feedback: 'Sugar crash incoming in 20 minutes!', points: 5 },
      { text: 'C) Chug tap water and cry quietly', isHealthy: false, feedback: 'Hydration is good, but your body needed protein!', points: 10 },
    ],
  },
  {
    id: 2,
    question: "You just finished an intense leg day workout. Your legs are jelly!",
    avatarEmoji: '😫',
    options: [
      { text: 'A) Whey protein shake & banana', isHealthy: true, feedback: 'Perfect post-workout recovery window meal!', points: 25 },
      { text: 'B) Large bucket of salty popcorn', isHealthy: false, feedback: 'High sodium, missing essential amino acids for repair!', points: 5 },
      { text: 'C) Take a 3-hour nap immediately', isHealthy: false, feedback: 'Rest is great, but refuel your muscles first!', points: 10 },
    ],
  },
  {
    id: 3,
    question: "Late night study session! Midnight cravings hit hard.",
    avatarEmoji: '🤤',
    options: [
      { text: 'A) Greek yogurt with berries', isHealthy: true, feedback: 'Casein protein supports slow overnight recovery!', points: 25 },
      { text: 'B) Family-size bag of spicy chips', isHealthy: false, feedback: 'Late night acid reflux unlocked!', points: 5 },
      { text: 'C) Eat a raw onion like an apple', isHealthy: false, feedback: 'Bold move, but bad for your breath!', points: 0 },
    ],
  },
  {
    id: 4,
    question: "Morning rush! You have 5 minutes before your train leaves.",
    avatarEmoji: '⏰',
    options: [
      { text: 'A) Hard-boiled egg & whole grain toast', isHealthy: true, feedback: 'Quick complex carbs & protein on the go!', points: 25 },
      { text: 'B) Grab 2 sugary energy drinks', isHealthy: false, feedback: 'Jittery heart rate & afternoon crash guaranteed!', points: 5 },
      { text: 'C) Skip breakfast entirely', isHealthy: false, feedback: 'Metabolism slows down without morning fuel!', points: 10 },
    ],
  },
  {
    id: 5,
    question: "At the movie theater! The smell of butter fills the lobby.",
    avatarEmoji: '🍿',
    options: [
      { text: 'A) Unsalted mixed nuts or dark chocolate bite', isHealthy: true, feedback: 'Antioxidants & healthy fats win movie night!', points: 25 },
      { text: 'B) Mega-sized extra butter popcorn & XL soda', isHealthy: false, feedback: 'Over 1,200 empty calories in one sitting!', points: 5 },
      { text: 'C) Chew on ice cubes for 2 hours', isHealthy: false, feedback: 'Your teeth won\'t thank you for this!', points: 10 },
    ],
  },
  {
    id: 6,
    question: "Airport layover! You have 45 minutes of walking ahead.",
    avatarEmoji: '✈️',
    options: [
      { text: 'A) Grilled chicken salad bowl', isHealthy: true, feedback: 'Keeps you satisfied without feeling bloated on flight!', points: 25 },
      { text: 'B) Double bacon cheeseburger combo', isHealthy: false, feedback: 'Heavy fats cause sluggishness in cramped seats!', points: 5 },
      { text: 'C) Eat 5 duty-free candy bars', isHealthy: false, feedback: 'Sugar spike before a long flight is a mistake!', points: 5 },
    ],
  },
  {
    id: 7,
    question: "Post-5k run cramp! Your calves are contracting.",
    avatarEmoji: '🏃‍♂️',
    options: [
      { text: 'A) Coconut water with pinch of sea salt & banana', isHealthy: true, feedback: 'Natural potassium & sodium restoration!', points: 25 },
      { text: 'B) Ice cold beer', isHealthy: false, feedback: 'Alcohol dehydrates muscles further and impairs recovery!', points: 5 },
      { text: 'C) Chug 3 cups of hot black coffee', isHealthy: false, feedback: 'Caffeine increases muscle tightness and dehydration!', points: 10 },
    ],
  },
  {
    id: 8,
    question: "Road trip pitstop at a remote gas station!",
    avatarEmoji: '🚗',
    options: [
      { text: 'A) Beef jerky & sunflower seeds', isHealthy: true, feedback: 'High protein snack that keeps driver alert!', points: 25 },
      { text: 'B) 3 powdered sugar donuts & soda', isHealthy: false, feedback: 'Drowsiness will hit behind the wheel in 30 mins!', points: 5 },
      { text: 'C) Single stick of sugarless gum', isHealthy: false, feedback: 'Chewing tricks your stomach into making excess acid!', points: 10 },
    ],
  },
  {
    id: 9,
    question: "Brain fog strikes before a crucial team presentation!",
    avatarEmoji: '🤯',
    options: [
      { text: 'A) Matcha green tea & walnuts', isHealthy: true, feedback: 'L-theanine + Omega-3s boost sharp mental clarity!', points: 25 },
      { text: 'B) Triple espresso with 4 sugars', isHealthy: false, feedback: 'Nervous jitters will make your voice shake!', points: 5 },
      { text: 'C) Stare at blank wall hoping ideas appear', isHealthy: false, feedback: 'Your brain needs actual glucose & oxygen!', points: 10 },
    ],
  },
  {
    id: 10,
    question: "Sunday brunch buffet! Endless options on display.",
    avatarEmoji: '🥞',
    options: [
      { text: 'A) Veggie omelet with avocado & smoked salmon', isHealthy: true, feedback: 'Nutrient-dense powerhouse breakfast!', points: 25 },
      { text: 'B) Stack of syrup-drenched pancakes & bacon', isHealthy: false, feedback: 'Massive insulin spike leads to instant food coma!', points: 5 },
      { text: 'C) Only eat parsley garnishes', isHealthy: false, feedback: 'Too restrictive! Enjoy real food in balance.', points: 10 },
    ],
  },
  {
    id: 11,
    question: "High stress workday! Deadline in 1 hour.",
    avatarEmoji: '⚡',
    options: [
      { text: 'A) Edamame beans & hummous with carrot sticks', isHealthy: true, feedback: 'Crunchy stress-relief with fiber and protein!', points: 25 },
      { text: 'B) Box of chocolate chip cookies', isHealthy: false, feedback: 'Emotional eating triggers blood sugar swings!', points: 5 },
      { text: 'C) Bite your fingernails uncontrollably', isHealthy: false, feedback: 'Not a recognized source of nutrition!', points: 0 },
    ],
  },
  {
    id: 12,
    question: "Pre-gym energy boost 45 minutes before lifting!",
    avatarEmoji: '🏋️‍♀️',
    options: [
      { text: 'A) Oatmeal with chia seeds & sliced apple', isHealthy: true, feedback: 'Sustained complex carb burn for intense training!', points: 25 },
      { text: 'B) Heavy fried chicken platter', isHealthy: false, feedback: 'Fat takes hours to digest, causing stomach cramps!', points: 5 },
      { text: 'C) Drink 1 liter of plain whole milk', isHealthy: false, feedback: 'Lactose heavy stomach sloshing incoming!', points: 10 },
    ],
  },
  {
    id: 13,
    question: "Hot summer afternoon! Sweat is dripping.",
    avatarEmoji: '☀️',
    options: [
      { text: 'A) Watermelon slices & cold mint infused water', isHealthy: true, feedback: '92% water content plus lycopene antioxidant!', points: 25 },
      { text: 'B) Creamy caramel milk fudge sundae', isHealthy: false, feedback: 'Saturated fat slows down heat dissipation!', points: 5 },
      { text: 'C) Eat ice cubes directly from freezer tray', isHealthy: false, feedback: 'Cooling, but zero hydration electrolyte recovery!', points: 10 },
    ],
  },
  {
    id: 14,
    question: "Chilly winter evening craving something warm!",
    avatarEmoji: '❄️',
    options: [
      { text: 'A) Lentil soup with turmeric & spinach', isHealthy: true, feedback: 'Anti-inflammatory warmth packed with plant protein!', points: 25 },
      { text: 'B) Canned processed sodium soup with crackers', isHealthy: false, feedback: 'Sodium overload causes morning puffiness!', points: 10 },
      { text: 'C) Drink boiling hot tap water', isHealthy: false, feedback: 'Ouch! Protect your mouth lining.', points: 5 },
    ],
  },
  {
    id: 15,
    question: "Late night gaming marathon with friends online!",
    avatarEmoji: '🎮',
    options: [
      { text: 'A) Air-popped popcorn with nutritional yeast', isHealthy: true, feedback: 'Savory B-vitamin crunch without heavy oils!', points: 25 },
      { text: 'B) Large pepperoni pizza & 2L cola', isHealthy: false, feedback: 'Heavy grease disrupts deep REM sleep cycles!', points: 5 },
      { text: 'C) Drink 4 high-caffeine shot vials', isHealthy: false, feedback: 'Insomnia & heart palpitations unlocked!', points: 5 },
    ],
  },
  {
    id: 16,
    question: "Quick 10-minute lunch break between back-to-back Zoom calls!",
    avatarEmoji: '💻',
    options: [
      { text: 'A) Turkey breast wrap with spinach & avocado', isHealthy: true, feedback: 'Lean protein + healthy fats fuel afternoon focus!', points: 25 },
      { text: 'B) Microwave instant instant ramen noodles', isHealthy: false, feedback: 'Ultra-processed sodium bomb drains energy!', points: 10 },
      { text: 'C) Gulp a protein powder dry scoop', isHealthy: false, feedback: 'Choking hazard! Always mix protein with liquid.', points: 5 },
    ],
  },
  {
    id: 17,
    question: "Pre-bedtime light hunger pangs at 10:30 PM.",
    avatarEmoji: '🌙',
    options: [
      { text: 'A) Small bowl of cottage cheese or pumpkin seeds', isHealthy: true, feedback: 'Tryptophan & magnesium promote restful sleep!', points: 25 },
      { text: 'B) Spicy jalapeno tacos', isHealthy: false, feedback: 'Capsaicin elevates core temperature & disturbs sleep!', points: 5 },
      { text: 'C) Chug a full gallon of ice water', isHealthy: false, feedback: 'You will wake up 5 times to visit the bathroom!', points: 10 },
    ],
  },
  {
    id: 18,
    question: "Mid-trail mountain hike energy drop!",
    avatarEmoji: '🏔️',
    options: [
      { text: 'A) Homemade trail mix with almonds, raisins & dark cocoa', isHealthy: true, feedback: 'Perfect balance of fast energy & long-lasting fats!', points: 25 },
      { text: 'B) Cotton candy bundle', isHealthy: false, feedback: 'Instant sugar crash leaves you stranded on trail!', points: 5 },
      { text: 'C) Chew on wild pine needles', isHealthy: false, feedback: 'Stick to verified safe portable hiking snacks!', points: 5 },
    ],
  },
  {
    id: 19,
    question: "Post-exam celebration with classmates!",
    avatarEmoji: '🎓',
    options: [
      { text: 'A) Mediterranean platter with falafel, hummus & tabbouleh', isHealthy: true, feedback: 'Nutrient dense celebration feast!', points: 25 },
      { text: 'B) 3 fried chili cheese corn dogs', isHealthy: false, feedback: 'Trans fats will make you feel sluggish all evening!', points: 5 },
      { text: 'C) Fast for 24 hours straight', isHealthy: false, feedback: 'Nourish your body after intense cognitive work!', points: 10 },
    ],
  },
  {
    id: 20,
    question: "Rainy Sunday lazy afternoon on the couch!",
    avatarEmoji: '🛋️',
    options: [
      { text: 'A) Warm chamomile tea & roasted chickpeas', isHealthy: true, feedback: 'Cozy, crunchy & full of gut-friendly fiber!', points: 25 },
      { text: 'B) Entire tub of chocolate ice cream', isHealthy: false, feedback: 'High saturated fat and refined sugar bomb!', points: 5 },
      { text: 'C) Nap without drinking any water all day', isHealthy: false, feedback: 'Dehydration leads to dull headaches!', points: 10 },
    ],
  },
  {
    id: 21,
    question: "Early morning pre-fasted cardio decision at 6 AM!",
    avatarEmoji: '🌅',
    options: [
      { text: 'A) Half a banana & cup of black coffee', isHealthy: true, feedback: 'Light glycogen boost without stomach heaviness!', points: 25 },
      { text: 'B) Stack of 4 sausage breakfast biscuits', isHealthy: false, feedback: 'Severe digestion issues during cardio!', points: 5 },
      { text: 'C) Drink zero fluids and sprint 10km', isHealthy: false, feedback: 'High risk of dizziness and heat stress!', points: 5 },
    ],
  },
  {
    id: 22,
    question: "Post-dental procedure! You need soft food choices.",
    avatarEmoji: '🦷',
    options: [
      { text: 'A) Blended smoothie with mango, protein powder & kefir', isHealthy: true, feedback: 'Smooth, soothing & packed with probiotics!', points: 25 },
      { text: 'B) Crunch on hard tortilla chips', isHealthy: false, feedback: 'Sharp edges irritate sensitive gums!', points: 5 },
      { text: 'C) Swallow whole raw carrots', isHealthy: false, feedback: 'Choking hazard! Stick to soft textures.', points: 5 },
    ],
  },
  {
    id: 23,
    question: "Office birthday party! Cake and punch on the table.",
    avatarEmoji: '🎂',
    options: [
      { text: 'A) Small slice of cake alongside fresh fruit bowl', isHealthy: true, feedback: 'Mindful enjoyment without sugar overload!', points: 25 },
      { text: 'B) 3 giant slices of cake & 4 cups punch', isHealthy: false, feedback: 'Massive blood sugar spike followed by brain fatigue!', points: 5 },
      { text: 'C) Stand in corner scowling at birthday boy', isHealthy: false, feedback: 'Life is about balance & social connection!', points: 10 },
    ],
  },
  {
    id: 24,
    question: "Post-soccer match hydration decision!",
    avatarEmoji: '⚽',
    options: [
      { text: 'A) Electrolyte drink with orange slices', isHealthy: true, feedback: 'Replaces lost minerals & glycogen store!', points: 25 },
      { text: 'B) 3 cans of fizzy soda', isHealthy: false, feedback: 'Carbonation causes stomach bloating after exercise!', points: 5 },
      { text: 'C) Drink lake water nearby', isHealthy: false, feedback: 'Unfiltered water carries digestive risk!', points: 0 },
    ],
  },
  {
    id: 25,
    question: "Late night drive-thru window at 11:30 PM!",
    avatarEmoji: '🍔',
    options: [
      { text: 'A) Grilled chicken wrap with side salad', isHealthy: true, feedback: 'Smarter fast food alternative late at night!', points: 25 },
      { text: 'B) Quadruple bacon burger & XL fries', isHealthy: false, feedback: 'Heavy oil causes heartburn during sleep!', points: 5 },
      { text: 'C) Deep fried onion rings with extra mayo', isHealthy: false, feedback: 'High trans-fat load causes inflammation!', points: 5 },
    ],
  },
  {
    id: 26,
    question: "Grocery shopping on an empty stomach!",
    avatarEmoji: '🛒',
    options: [
      { text: 'A) Eat an apple or protein bar before entering aisle', isHealthy: true, feedback: 'Smart barrier against impulse snack buying!', points: 25 },
      { text: 'B) Fill cart with 10 boxes of sugary cereal', isHealthy: false, feedback: 'Hunger shopping leads to junk food overload!', points: 5 },
      { text: 'C) Open & sample food in aisles before paying', isHealthy: false, feedback: 'Store security will not appreciate this!', points: 5 },
    ],
  },
  {
    id: 27,
    question: "High stress exam morning breakfast!",
    avatarEmoji: '📝',
    options: [
      { text: 'A) Scrambled eggs, spinach & whole grain toast', isHealthy: true, feedback: 'Choline in eggs supports memory & focus!', points: 25 },
      { text: 'B) Eat nothing due to nervous stomach', isHealthy: false, feedback: 'Hypoglycemia ruins cognitive test stamina!', points: 10 },
      { text: 'C) 3 chocolate glazed pastries', isHealthy: false, feedback: 'Sugar crash halfway through exam time!', points: 5 },
    ],
  },
  {
    id: 28,
    question: "Post-sauna sweat session refuel!",
    avatarEmoji: '🧖‍♀️',
    options: [
      { text: 'A) Chilled coconut water with cucumber', isHealthy: true, feedback: 'Optimal mineral replenishment after heavy sweating!', points: 25 },
      { text: 'B) Hot espresso shot', isHealthy: false, feedback: 'Diuretic caffeine accelerates fluid loss!', points: 5 },
      { text: 'C) Salty processed meat stick', isHealthy: false, feedback: 'High sodium without water aggravates thirst!', points: 10 },
    ],
  },
  {
    id: 29,
    question: "Coffee shop pastry display temptation!",
    avatarEmoji: '☕',
    options: [
      { text: 'A) Americano with oat milk & almond biscotti', isHealthy: true, feedback: 'Moderate sweet treat with fiber boost!', points: 25 },
      { text: 'B) XL caramel frappuccino with whipped cream & chocolate muffin', isHealthy: false, feedback: 'Over 80g of sugar in a single morning order!', points: 5 },
      { text: 'C) Sniff coffee beans repeatedly without ordering', isHealthy: false, feedback: 'Smells nice, but provides zero energy!', points: 10 },
    ],
  },
  {
    id: 30,
    question: "Cycling 30 miles under the morning sun!",
    avatarEmoji: '🚴‍♂️',
    options: [
      { text: 'A) Energy gel or dates with electrolyte water', isHealthy: true, feedback: 'Fast absorbing carbs fuel continuous pedaling!', points: 25 },
      { text: 'B) Eat a heavy beef burrito mid-ride', isHealthy: false, feedback: 'Digestion diverts blood flow away from legs!', points: 5 },
      { text: 'C) Drink zero water to save weight on bike', isHealthy: false, feedback: 'Dehydration drastically lowers power output!', points: 5 },
    ],
  },
  {
    id: 31,
    question: "Long flight delay in airport terminal lounge!",
    avatarEmoji: '🧳',
    options: [
      { text: 'A) Fresh fruit salad & unsalted cashew nuts', isHealthy: true, feedback: 'Hydrating vitamins keep immune system strong!', points: 25 },
      { text: 'B) Unlimited complimentary cocktail drinks & salted chips', isHealthy: false, feedback: 'Jet lag & dehydration will feel twice as bad!', points: 5 },
      { text: 'C) Sleep on terminal floor without eating for 12 hours', isHealthy: false, feedback: 'Keep energy levels steady during travel disruption!', points: 10 },
    ],
  },
  {
    id: 32,
    question: "Post-cleaning house marathon! You worked up a sweat.",
    avatarEmoji: '🧹',
    options: [
      { text: 'A) Cottage cheese bowl with pineapple chunks', isHealthy: true, feedback: 'Proteolytic enzymes in pineapple assist recovery!', points: 25 },
      { text: 'B) Large bag of fried potato chips', isHealthy: false, feedback: 'High saturated fats negate your active calorie burn!', points: 5 },
      { text: 'C) Reward yourself by lying motionless on clean floor', isHealthy: false, feedback: 'Rest is great, but nourish your body first!', points: 10 },
    ],
  },
];

/**
 * Initialize DB storage with seeded scenarios inside SQLite table & local DB cache.
 */
export async function initScenarioDatabase(): Promise<Scenario[]> {
  let db: any = null;
  try {
    db = await getSqliteDB();
  } catch (e) {
    db = null;
  }

  // Try fetching from SQLite DB first if available
  if (db) {
    try {
      const rows: any[] = await db.getAllAsync('SELECT * FROM hanger_scenarios;');

      if (rows && rows.length >= 30) {
        return rows.map((r: any) => ({
          id: r.id,
          question: r.question,
          avatarEmoji: r.avatar_emoji,
          options: JSON.parse(r.options_json),
        }));
      }

      // Seed SQLite database table with initial 32 scenarios
      for (const item of SEED_SCENARIOS) {
        await db.runAsync(
          'INSERT OR REPLACE INTO hanger_scenarios (id, question, avatar_emoji, options_json) VALUES (?, ?, ?, ?);',
          [item.id, item.question, item.avatarEmoji, JSON.stringify(item.options)]
        );
      }
      return SEED_SCENARIOS;
    } catch (e) {
      console.warn('SQLite init warning, using AsyncStorage DB table:', e);
    }
  }

  // Fall back to Supabase or AsyncStorage DB table
  try {
    const { data: supabaseData, error } = await supabase
      .from('hanger_scenarios')
      .select('*');

    if (!error && supabaseData && supabaseData.length >= 30) {
      const formattedSupabase: Scenario[] = supabaseData.map((item: any) => ({
        id: item.id,
        question: item.question,
        avatarEmoji: item.avatar_emoji || item.avatarEmoji || '🥦',
        options: typeof item.options === 'string' ? JSON.parse(item.options) : item.options,
      }));
      await AsyncStorage.setItem(DB_TABLE_KEY, JSON.stringify(formattedSupabase));
      return formattedSupabase;
    }
  } catch (e) {
    // Ignore and fallback
  }

  try {
    const raw = await AsyncStorage.getItem(DB_TABLE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(DB_TABLE_KEY, JSON.stringify(SEED_SCENARIOS));
      return SEED_SCENARIOS;
    }
    const parsed: Scenario[] = JSON.parse(raw);
    if (parsed.length < 30) {
      await AsyncStorage.setItem(DB_TABLE_KEY, JSON.stringify(SEED_SCENARIOS));
      return SEED_SCENARIOS;
    }
    return parsed;
  } catch (error) {
    console.error('Error initializing scenario DB:', error);
    return SEED_SCENARIOS;
  }
}

/**
 * Fetch a batch of scenarios from the DB table (default 10 at a time).
 */
export async function getScenariosFromDB(
  limit: number = 10,
  offset: number = 0,
  randomize: boolean = false
): Promise<{ scenarios: Scenario[]; totalScenarios: number; currentOffset: number; hasMore: boolean }> {
  let db: any = null;
  try {
    db = await getSqliteDB();
  } catch (e) {
    db = null;
  }

  if (db && !randomize) {
    try {
      const countResult: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM hanger_scenarios;');
      const total = countResult?.count || 32;

      const rows: any[] = await db.getAllAsync(
        'SELECT * FROM hanger_scenarios LIMIT ? OFFSET ?;',
        [limit, offset]
      );

      if (rows && rows.length > 0) {
        const scenarios: Scenario[] = rows.map((r: any) => ({
          id: r.id,
          question: r.question,
          avatarEmoji: r.avatar_emoji,
          options: JSON.parse(r.options_json),
        }));
        return {
          scenarios,
          totalScenarios: total,
          currentOffset: offset,
          hasMore: offset + limit < total,
        };
      }
    } catch (err) {
      console.warn('Error reading from SQLite table:', err);
    }
  }

  const allScenarios = await initScenarioDatabase();
  const total = allScenarios.length;

  let pool = [...allScenarios];
  if (randomize) {
    pool = pool.sort(() => Math.random() - 0.5);
  }

  const normalizedOffset = offset >= total ? 0 : offset;
  const sliced = pool.slice(normalizedOffset, normalizedOffset + limit);
  const hasMore = normalizedOffset + limit < total;

  return {
    scenarios: sliced,
    totalScenarios: total,
    currentOffset: normalizedOffset,
    hasMore,
  };
}

/**
 * Get total scenario count stored in DB
 */
export async function getScenarioCountFromDB(): Promise<number> {
  let db: any = null;
  try {
    db = await getSqliteDB();
  } catch (e) {
    db = null;
  }

  if (db) {
    try {
      const result: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM hanger_scenarios;');
      if (result) return result.count;
    } catch (e) {
      // fallback
    }
  }
  const scenarios = await initScenarioDatabase();
  return scenarios.length;
}



