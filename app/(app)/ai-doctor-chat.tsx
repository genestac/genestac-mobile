import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, StatusBar, Image,
  ActivityIndicator, Dimensions, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { healthChat, HealthChatMessage } from '@/lib/healthChat';
import { SarvamVoiceAgent, VoiceAgentStatus } from '@/lib/sarvamVoice';
import { analyzeFoodImage, FoodItem } from '@/lib/openai';
import { MealLog, WeightJourney } from '@/lib/types';

const { width } = Dimensions.get('window');

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  teal: '#0E7C86', tealLight: '#14A2AF', tealMuted: '#E6F5F7', tealDark: '#0A5E66',
  navy: '#0B1F3A', bg: '#F0F4F8',
  white: '#FFFFFF', border: '#D6E8EB',
  textPrimary: '#0B1F3A', textSecondary: '#4A6E78', textMuted: '#8AADB5',
  success: '#10B981', danger: '#EF4444', warning: '#F59E0B',
  voiceBg: '#091526', voiceRing: 'rgba(14,124,134,0.3)', voiceActive: '#14A2AF',
};

// ── Greeting prompt (backend owns the full system prompt + user context) ───────
// This is only used for the first-time greeting message sent to the backend.
// The backend injects the user's health profile, daily logs and plans automatically.
const GREETING_USER_MSG = (name?: string) =>
  name
    ? `Hi! My name is ${name}. Please greet me and begin the health intake.`
    : `Hi! Please greet me and begin the health intake.`;

// ── Known intents for suggested quick replies ──────────────────────────────────
const SUGGESTIONS_MAP: Record<string, string[]> = {
  default: ['Tell me about my health', 'Weight loss tips', 'Sleep improvement', 'Stress management'],
  weight: ['What should I eat?', 'Best exercises for me', 'Track my progress', 'How long will it take?'],
  sleep: ['Better sleep routine', 'Relaxation techniques', 'Screen time habits', 'Sleep schedule tips'],
  stress: ['Breathing exercises', 'Meditation tips', 'Work-life balance', 'Anxiety management'],
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isVoice?: boolean;
};

type VoiceState = 'idle' | 'connecting' | 'connected' | 'listening' | 'processing' | 'speaking' | 'ended' | 'error';

// ── Typing Indicator ───────────────────────────────────────────────────────────
function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]))
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);
  return (
    <View style={s.typingBubble}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[s.typingDot, { opacity: dot, transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]} />
      ))}
    </View>
  );
}

// ── Voice Pulse Animation ──────────────────────────────────────────────────────
function VoicePulse({ active, color = C.tealLight }: { active: boolean; color?: string }) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.4)).current;
  const opacity2 = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    if (active) {
      const anim = Animated.loop(Animated.parallel([
        Animated.sequence([
          Animated.timing(scale1, { toValue: 1.4, duration: 800, useNativeDriver: true }),
          Animated.timing(scale1, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity1, { toValue: 0, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(scale2, { toValue: 1.7, duration: 800, useNativeDriver: true }),
          Animated.timing(scale2, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(opacity2, { toValue: 0, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        ]),
      ]));
      anim.start();
      return () => anim.stop();
    } else {
      scale1.setValue(1); scale2.setValue(1);
      opacity1.setValue(0.4); opacity2.setValue(0.2);
    }
  }, [active]);
  return (
    <View style={s.pulseContainer}>
      <Animated.View style={[s.pulseRing, s.pulseRing2, { transform: [{ scale: scale2 }], opacity: opacity2, borderColor: color }]} />
      <Animated.View style={[s.pulseRing, { transform: [{ scale: scale1 }], opacity: opacity1, borderColor: color }]} />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AIDoctorChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [agentSpeechBuffer, setAgentSpeechBuffer] = useState('');
  const [suggestions, setSuggestions] = useState(SUGGESTIONS_MAP.default);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  // ── Camera diet logging state ──────────────────────────────────────────────
  const [cameraLoading, setCameraLoading] = useState(false);
  const [foodModal, setFoodModal] = useState(false);
  const [detectedFoods, setDetectedFoods] = useState<FoodItem[]>([]);
  const [foodServings, setFoodServings] = useState<number[]>([]);
  const [foodGrams, setFoodGrams] = useState<string[]>([]); // actual grams override per item
  const [mealDescCaption, setMealDescCaption] = useState('');
  const [mealType, setMealType] = useState<'Morning' | 'Lunch' | 'Snacks' | 'Dinner'>('Lunch');
  const [savingMeal, setSavingMeal] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const agentRef = useRef<SarvamVoiceAgent | null>(null);
  const sarvamMessagesRef = useRef<HealthChatMessage[]>([]);
  const agentSpeechRef = useRef('');

  // ── Load session ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        setUserId(session.user.id);

        // Fetch user profile
        const { data: user } = await supabase.from('users').select('name').eq('id', session.user.id).maybeSingle();
        if (user?.name) setUserName(user.name.split(' ')[0]);

        // Load chat session
        const { data: chatSession } = await supabase
          .from('ai_doctor_sessions')
          .select('messages')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (chatSession?.messages && chatSession.messages.length > 0) {
          const stored: ChatMessage[] = chatSession.messages;
          setMessages(stored);
          // Rebuild Sarvam context from stored messages
          sarvamMessagesRef.current = stored
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        } else {
          // First time — send greeting
          await sendGreeting(session.user.id, user?.name);
        }
      } catch (e) {
        console.warn('[AIChat] Session load error:', e);
      } finally {
        setSessionLoaded(true);
      }
    })();
  }, []);

  // ── Greeting on first open ────────────────────────────────────────────────────
  const sendGreeting = async (uid: string, name?: string) => {
    setIsTyping(true);
    try {
      const reply = await healthChat([{ role: 'user', content: GREETING_USER_MSG(name) }]);
      const msg: ChatMessage = { id: Date.now().toString(), role: 'assistant', content: reply, timestamp: Date.now() };
      setMessages([msg]);
      sarvamMessagesRef.current = [{ role: 'assistant', content: reply }];
      await saveSession(uid, [msg]);
    } catch (e) {
      console.warn('[AIChat] Greeting error:', e);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Save session to Supabase ──────────────────────────────────────────────────
  const saveSession = async (uid: string, msgs: ChatMessage[]) => {
    if (!uid) return;
    try {
      const { data: existing } = await supabase.from('ai_doctor_sessions').select('id').eq('user_id', uid).maybeSingle();
      if (existing?.id) {
        await supabase.from('ai_doctor_sessions').update({ messages: msgs, updated_at: new Date().toISOString() }).eq('user_id', uid);
      } else {
        await supabase.from('ai_doctor_sessions').insert({ user_id: uid, messages: msgs });
      }
    } catch (e) {
      console.warn('[AIChat] Save session error:', e);
    }
  };

  // ── Scroll to bottom ──────────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages, isTyping]);

  // ── Send text message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? inputText).trim();
    if (!content) return;
    setInputText('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    sarvamMessagesRef.current = [...sarvamMessagesRef.current, { role: 'user', content }];

    setIsTyping(true);
    setSuggestions([]);

    try {
      const reply = await healthChat(sarvamMessagesRef.current);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: Date.now() };
      sarvamMessagesRef.current = [...sarvamMessagesRef.current, { role: 'assistant', content: reply }];
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // Smart suggestions based on content
      const lower = reply.toLowerCase();
      if (lower.includes('weight') || lower.includes('diet')) setSuggestions(SUGGESTIONS_MAP.weight);
      else if (lower.includes('sleep') || lower.includes('fatigue')) setSuggestions(SUGGESTIONS_MAP.sleep);
      else if (lower.includes('stress') || lower.includes('anxiety')) setSuggestions(SUGGESTIONS_MAP.stress);
      else setSuggestions(SUGGESTIONS_MAP.default);

      if (userId) await saveSession(userId, finalMessages);
    } catch (e) {
      const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I encountered a connection issue. Please try again.', timestamp: Date.now() };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, messages, userId]);

  // ── Voice mode ────────────────────────────────────────────────────────────────
  const startVoiceCall = async () => {
    if (!userId) return;
    setVoiceMode(true);
    setVoiceState('connecting');
    setVoiceTranscript('');
    agentSpeechRef.current = '';
    setAgentSpeechBuffer('');

    // Build agent variables from existing context
    const contextSummary = sarvamMessagesRef.current
      .slice(-6) // last 3 turns
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');

    agentRef.current = new SarvamVoiceAgent({
      userIdentifier: userId,
      agentVariables: {
        user_name: userName || 'User',
        conversation_context: contextSummary,
        platform: 'genestac_mobile',
      },
      callbacks: {
        onStatusChange: (status) => setVoiceState(status as VoiceState),
        onTranscript: (text, isFinal) => {
          setVoiceTranscript(text);
          if (isFinal) {
            // Add voice transcript to chat as user message (without re-sending to AI — Sarvam handles that)
            const msg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now(), isVoice: true };
            setMessages(prev => [...prev, msg]);
            sarvamMessagesRef.current = [...sarvamMessagesRef.current, { role: 'user', content: text }];
            setVoiceTranscript('');
          }
        },
        onAgentText: (text) => {
          agentSpeechRef.current += text;
          setAgentSpeechBuffer(agentSpeechRef.current);
        },
        onError: (error) => {
          console.error('[Voice]', error);
          setVoiceState('error');
        },
      },
    });

    await agentRef.current.connect();
  };

  const endVoiceCall = async () => {
    // Save final agent speech as a message if we have any
    if (agentSpeechRef.current.trim()) {
      const aiMsg: ChatMessage = {
        id: Date.now().toString(), role: 'assistant',
        content: agentSpeechRef.current.trim(), timestamp: Date.now(), isVoice: true,
      };
      const finalMessages = [...messages, aiMsg];
      setMessages(finalMessages);
      sarvamMessagesRef.current = [...sarvamMessagesRef.current, { role: 'assistant', content: agentSpeechRef.current.trim() }];
      if (userId) await saveSession(userId, finalMessages);
    }

    await agentRef.current?.disconnect();
    agentRef.current = null;
    agentSpeechRef.current = '';
    setAgentSpeechBuffer('');
    setVoiceTranscript('');
    setVoiceMode(false);
    setVoiceState('idle');
  };

  // ── Camera diet logging ───────────────────────────────────────────────────────
  const handleCameraLog = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to log meals from photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        quality: 0.6,
        base64: true,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setCapturedImageUri(asset.uri);
      setCameraLoading(true);

      // Convert to base64 if not already provided
      let base64 = asset.base64;
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      }

      const analysis = await analyzeFoodImage(base64!);
      setDetectedFoods(analysis.items);
      setFoodServings(analysis.items.map(() => 1)); // default 1 serving each
      setFoodGrams(analysis.items.map(() => '')); // empty = use servings × base
      setMealDescCaption(analysis.mealDescription);

      // Auto-set meal type based on time of day
      const hour = new Date().getHours();
      if (hour < 11) setMealType('Morning');
      else if (hour < 15) setMealType('Lunch');
      else if (hour < 18) setMealType('Snacks');
      else setMealType('Dinner');

      setFoodModal(true);
    } catch (err) {
      console.error('[CameraLog]', err);
      Alert.alert('Error', 'Could not analyze the photo. Please try again.');
    } finally {
      setCameraLoading(false);
    }
  };

  // Calories = grams input takes priority over servings multiplier
  const getItemCalories = (item: FoodItem, idx: number): number => {
    const gramsStr = foodGrams[idx]?.trim();
    const grams = gramsStr ? parseFloat(gramsStr) : NaN;
    if (!isNaN(grams) && grams > 0 && item.servingGrams > 0) {
      // Scale proportionally: (userGrams / servingGrams) * baseCalories
      return Math.round((grams / item.servingGrams) * item.calories);
    }
    // Fall back to serving multiplier
    return Math.round(item.calories * (foodServings[idx] ?? 1));
  };

  const totalCaloriesFromDetected = detectedFoods.reduce(
    (sum, item, i) => sum + getItemCalories(item, i), 0
  );

  const handleConfirmMealLog = async () => {
    if (!userId) return;
    setSavingMeal(true);
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('weight_loss_journey')
        .eq('id', userId)
        .maybeSingle();

      const journey: WeightJourney = (userRow?.weight_loss_journey as WeightJourney) || { history: [] };
      const description = detectedFoods
        .map((f, i) => {
          const gramsStr = foodGrams[i]?.trim();
          const grams = gramsStr ? parseFloat(gramsStr) : NaN;
          if (!isNaN(grams) && grams > 0) {
            return `${f.name} (${grams}g)`;
          }
          return `${f.name} (${foodServings[i]}× ${f.quantity})`;
        })
        .join(', ');

      const newMeal: MealLog = {
        id: Math.random().toString(36).substring(7),
        date: new Date().toISOString(),
        mealType,
        description,
        calories: totalCaloriesFromDetected,
        feedback: `Logged via camera. ${mealDescCaption}`,
      };
      const meals = [...(journey.meals || []), newMeal];
      await supabase.from('users').update({ weight_loss_journey: { ...journey, meals } }).eq('id', userId);

      setFoodModal(false);
      Alert.alert('Meal Logged! 🎉', `${description}\n\n${totalCaloriesFromDetected} kcal logged for ${mealType}.`);
    } catch (err) {
      Alert.alert('Error', 'Could not save meal. Please try again.');
    } finally {
      setSavingMeal(false);
    }
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { agentRef.current?.disconnect(); };
  }, []);

  // ── Voice status label ────────────────────────────────────────────────────────
  const voiceStatusLabel: Record<VoiceState, string> = {
    idle: '', connecting: 'Connecting...', connected: 'Connected',
    listening: 'Listening...', processing: 'Thinking...', speaking: 'Health Coach is speaking...',
    ended: 'Call ended', error: 'Connection failed',
  };

  const voiceStatusColor: Record<VoiceState, string> = {
    idle: C.textMuted, connecting: C.warning, connected: C.success,
    listening: C.tealLight, processing: C.warning, speaking: C.voiceActive,
    ended: C.textMuted, error: C.danger,
  };

  // ── Voice call overlay ────────────────────────────────────────────────────────
  if (voiceMode) {
    return (
      <View style={s.voiceOverlay}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={s.voiceHeader}>
            <View>
              <Text style={s.voiceHeaderTitle}>Genestac AI Health Coach</Text>
              <View style={s.voiceStatusRow}>
                <View style={[s.voiceStatusDot, { backgroundColor: voiceStatusColor[voiceState] }]} />
                <Text style={[s.voiceStatusText, { color: voiceStatusColor[voiceState] }]}>
                  {voiceStatusLabel[voiceState]}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={endVoiceCall} style={s.voiceEndBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color={C.white} />
            </TouchableOpacity>
          </View>

          {/* Agent avatar + pulse */}
          <View style={s.voiceAvatarSection}>
            <VoicePulse active={voiceState === 'speaking' || voiceState === 'listening'} />
            <View style={s.voiceAvatarRing}>
              <Image source={require('../../assets/images/ai_doctor/doctor.png')} style={s.voiceAvatarImg} resizeMode="cover" />
            </View>
            <Text style={s.voiceAvatarName}>Genestac AI Health Coach</Text>

            {/* Live transcript / speech buffer */}
            <View style={s.voiceSpeechBox}>
              {voiceTranscript ? (
                <Text style={s.voiceTranscriptText}>You: {voiceTranscript}</Text>
              ) : agentSpeechBuffer ? (
                <Text style={s.voiceAgentText} numberOfLines={4}>{agentSpeechBuffer}</Text>
              ) : voiceState === 'listening' ? (
                <Text style={s.voiceHintText}>Speak now...</Text>
              ) : voiceState === 'connecting' ? (
                <ActivityIndicator color={C.tealLight} size="small" />
              ) : null}
            </View>
          </View>

          {/* Controls */}
          <View style={s.voiceControls}>
            <TouchableOpacity
              style={s.voiceInterruptBtn}
              onPress={() => agentRef.current?.interrupt()}
              activeOpacity={0.8}
            >
              <Ionicons name="hand-left" size={22} color={C.white} />
              <Text style={s.voiceInterruptLabel}>Interrupt</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.voiceHangupBtn} onPress={endVoiceCall} activeOpacity={0.8}>
              <Ionicons name="call" size={28} color={C.white} style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.voiceMuteBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={22} color={C.white} />
              <Text style={s.voiceInterruptLabel}>Mic On</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBack} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Image source={require('../../assets/images/ai_doctor/doctor.png')} style={s.headerAvatar} resizeMode="cover" />
          <View>
            <Text style={s.headerName}>Genestac AI Health Coach</Text>
            <Text style={s.headerSub}>Powered by Sarvam AI · Always available</Text>
          </View>
        </View>
        {/* Voice call button hidden from UI — code preserved */}
        {false && (
          <TouchableOpacity style={s.voiceCallBtn} onPress={startVoiceCall} activeOpacity={0.85}>
            <Ionicons name="call" size={20} color={C.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {!sessionLoaded ? (
          <View style={s.loadingView}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={s.loadingText}>Loading your health session...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.messageList}
            contentContainerStyle={s.messageListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[s.bubbleRow, msg.role === 'user' ? s.bubbleRowUser : s.bubbleRowAI]}
              >
                {msg.role === 'assistant' && (
                  <Image source={require('../../assets/images/ai_doctor/doctor.png')} style={s.bubbleAvatar} resizeMode="cover" />
                )}
                <View style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                  {msg.isVoice && (
                    <View style={s.voiceBadge}>
                      <Ionicons name="mic" size={10} color={msg.role === 'user' ? C.white : C.teal} />
                      <Text style={[s.voiceBadgeText, msg.role === 'user' && { color: 'rgba(255,255,255,0.7)' }]}>Voice</Text>
                    </View>
                  )}
                  <Text style={[s.bubbleText, msg.role === 'user' ? s.bubbleTextUser : s.bubbleTextAI]}>
                    {msg.content}
                  </Text>
                  <Text style={[s.bubbleTime, msg.role === 'user' && { color: 'rgba(255,255,255,0.5)' }]}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}

            {isTyping && (
              <View style={[s.bubbleRow, s.bubbleRowAI]}>
                <Image source={require('../../assets/images/ai_doctor/doctor.png')} style={s.bubbleAvatar} resizeMode="cover" />
                <TypingIndicator />
              </View>
            )}

            {/* Suggestions */}
            {!isTyping && suggestions.length > 0 && messages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestionsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {suggestions.map((s_) => (
                  <TouchableOpacity key={s_} style={s.suggestionChip} onPress={() => sendMessage(s_)} activeOpacity={0.8}>
                    <Text style={s.suggestionText}>{s_}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <View style={s.inputRow}>
            {/* Camera diet log button */}
            <TouchableOpacity
              style={s.cameraBtn}
              onPress={handleCameraLog}
              disabled={cameraLoading}
              activeOpacity={0.8}
            >
              {cameraLoading
                ? <ActivityIndicator size="small" color={C.teal} />
                : <Ionicons name="camera" size={22} color={C.teal} />}
            </TouchableOpacity>

            <TextInput
              style={s.input}
              placeholder="Ask your health coach..."
              placeholderTextColor={C.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[s.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isTyping}
              activeOpacity={0.8}
            >
              <Feather name="send" size={18} color={C.white} />
            </TouchableOpacity>
          </View>

          {/* Voice call shortcut — hidden from UI, code preserved */}
          {false && (
            <TouchableOpacity style={s.voiceBarBtn} onPress={startVoiceCall} activeOpacity={0.85}>
              <Ionicons name="mic" size={16} color={C.teal} />
              <Text style={s.voiceBarBtnText}>Start Voice Call with AI Health Coach</Text>
              <Ionicons name="call" size={16} color={C.teal} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ── Camera Food Log Confirmation Modal ──────────────────────────────── */}
      <Modal
        visible={foodModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFoodModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Confirm Meal</Text>
                <Text style={s.modalSubtitle} numberOfLines={2}>{mealDescCaption}</Text>
              </View>
              <TouchableOpacity onPress={() => setFoodModal(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Meal photo thumbnail */}
            {capturedImageUri && (
              <Image source={{ uri: capturedImageUri }} style={s.photoThumb} resizeMode="cover" />
            )}

            {/* Meal type selector */}
            <View style={s.mealTypeRow}>
              {(['Morning', 'Lunch', 'Snacks', 'Dinner'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.mealTypeChip, mealType === t && s.mealTypeChipActive]}
                  onPress={() => setMealType(t)}
                >
                  <Text style={[s.mealTypeText, mealType === t && s.mealTypeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Food item list with quantity controls */}
            <ScrollView style={s.foodList} showsVerticalScrollIndicator={false}>
              {detectedFoods.map((item, idx) => {
                const servings = foodServings[idx] ?? 1;
                const gramsStr = foodGrams[idx] ?? '';
                const itemCals = getItemCalories(item, idx);
                const usingGrams = gramsStr.trim() !== '' && !isNaN(parseFloat(gramsStr)) && parseFloat(gramsStr) > 0;
                return (
                  <View key={idx} style={s.foodItem}>
                    <View style={s.foodItemLeft}>
                      <Text style={s.foodName}>{item.name}</Text>
                      <Text style={s.foodQuantity}>
                        {usingGrams
                          ? `${gramsStr}g · ${Math.round(item.calories / item.servingGrams * 10) / 10} kcal/g`
                          : `${item.quantity} · ${item.calories} kcal/serving`}
                      </Text>
                      {/* Grams override input */}
                      <View style={s.gramsRow}>
                        <Ionicons name="scale-outline" size={13} color={usingGrams ? C.teal : C.textMuted} />
                        <TextInput
                          style={[s.gramsInput, usingGrams && s.gramsInputActive]}
                          placeholder={`${item.servingGrams}g (AI estimate)`}
                          placeholderTextColor={C.textMuted}
                          keyboardType="numeric"
                          value={gramsStr}
                          onChangeText={(val) => {
                            const updated = [...foodGrams];
                            updated[idx] = val;
                            setFoodGrams(updated);
                          }}
                          maxLength={6}
                        />
                        {usingGrams && (
                          <TouchableOpacity onPress={() => {
                            const updated = [...foodGrams];
                            updated[idx] = '';
                            setFoodGrams(updated);
                          }}>
                            <Ionicons name="close-circle" size={15} color={C.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {/* Only show ×servings when no gram override */}
                    {!usingGrams && (
                      <View style={s.qtyControl}>
                        <TouchableOpacity
                          style={s.qtyBtn}
                          onPress={() => {
                            const updated = [...foodServings];
                            updated[idx] = Math.max(0.25, parseFloat((servings - 0.25).toFixed(2)));
                            setFoodServings(updated);
                          }}
                        >
                          <Ionicons name="remove" size={16} color={C.teal} />
                        </TouchableOpacity>
                        <Text style={s.qtyValue}>{servings}×</Text>
                        <TouchableOpacity
                          style={s.qtyBtn}
                          onPress={() => {
                            const updated = [...foodServings];
                            updated[idx] = parseFloat((servings + 0.25).toFixed(2));
                            setFoodServings(updated);
                          }}
                        >
                          <Ionicons name="add" size={16} color={C.teal} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={[s.foodCals, usingGrams && { color: C.success }]}>{itemCals}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Total + confirm */}
            <View style={s.modalFooter}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Total Calories</Text>
                <Text style={s.totalCals}>{totalCaloriesFromDetected} kcal</Text>
              </View>
              <TouchableOpacity
                style={[s.confirmBtn, savingMeal && { opacity: 0.6 }]}
                onPress={handleConfirmMealLog}
                disabled={savingMeal}
                activeOpacity={0.85}
              >
                {savingMeal
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmBtnText}>Log This Meal ✓</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3,
  },
  headerBack: { padding: 8, borderRadius: 10, backgroundColor: '#F1F5F9', marginRight: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.tealMuted },
  headerName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  voiceCallBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.teal,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },

  // Messages
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.textSecondary, fontSize: 14 },
  messageList: { flex: 1 },
  messageListContent: { paddingVertical: 16, paddingHorizontal: 12, gap: 12, paddingBottom: 8 },

  // Bubbles
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  bubbleRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleRowAI: { alignSelf: 'flex-start' },
  bubbleAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.tealMuted },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: width * 0.68 },
  bubbleUser: { backgroundColor: C.teal, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: C.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: C.white, fontWeight: '500' },
  bubbleTextAI: { color: C.textPrimary },
  bubbleTime: { fontSize: 10, color: C.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  voiceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  voiceBadgeText: { fontSize: 10, color: C.teal, fontWeight: '600' },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.white, borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border,
  },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal },

  // Suggestions
  suggestionsRow: { marginTop: 4, marginBottom: 8 },
  suggestionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.tealMuted, borderWidth: 1, borderColor: C.tealLight + '50',
  },
  suggestionText: { fontSize: 13, color: C.teal, fontWeight: '600' },

  // Input bar
  inputBar: {
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    gap: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, backgroundColor: '#F0F4F8', borderRadius: 22, paddingHorizontal: 16,
    paddingTop: 10, paddingBottom: 10, fontSize: 15, color: C.textPrimary,
    maxHeight: 100, borderWidth: 1, borderColor: C.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  voiceBarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.tealMuted, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.tealLight + '40',
  },
  voiceBarBtnText: { fontSize: 13, color: C.teal, fontWeight: '600', flex: 1, textAlign: 'center' },

  // ── Voice overlay ─────────────────────────────────────────────────────────────
  voiceOverlay: { flex: 1, backgroundColor: C.voiceBg },
  voiceHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16,
  },
  voiceHeaderTitle: { fontSize: 17, fontWeight: '700', color: C.white },
  voiceStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  voiceStatusDot: { width: 8, height: 8, borderRadius: 4 },
  voiceStatusText: { fontSize: 13, fontWeight: '500' },
  voiceEndBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  voiceAvatarSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  pulseContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: C.tealLight },
  pulseRing2: { width: 180, height: 180, borderRadius: 90 },
  voiceAvatarRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: C.tealLight,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.tealDark, overflow: 'hidden',
  },
  voiceAvatarImg: { width: 120, height: 120 },
  voiceAvatarName: { fontSize: 18, fontWeight: '700', color: C.white, marginTop: 8 },

  voiceSpeechBox: {
    width: width - 48, minHeight: 64,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  voiceTranscriptText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  voiceAgentText: { color: C.white, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  voiceHintText: { color: C.voiceActive, fontSize: 15, fontWeight: '500' },

  voiceControls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 32, paddingBottom: 32, paddingHorizontal: 24,
  },
  voiceHangupBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.danger,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  voiceInterruptBtn: {
    alignItems: 'center', gap: 6, padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
  },
  voiceMuteBtn: {
    alignItems: 'center', gap: 6, padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
  },
  voiceInterruptLabel: { color: C.white, fontSize: 11, fontWeight: '600' },

  // ── Camera button ──────────────────────────────────────────────────────────────
  cameraBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.tealMuted, borderWidth: 1, borderColor: C.tealLight + '60',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Food modal ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(11,31,58,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32,
    maxHeight: '88%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.navy },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, marginTop: 3, maxWidth: width - 100 },
  modalClose: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  photoThumb: {
    width: '100%', height: 140, borderRadius: 16, marginBottom: 14,
    backgroundColor: C.tealMuted,
  },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mealTypeChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  mealTypeChipActive: { backgroundColor: C.teal, borderColor: C.teal },
  mealTypeText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  mealTypeTextActive: { color: '#fff' },
  foodList: { maxHeight: 240, marginBottom: 8 },
  foodItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8,
  },
  foodItemLeft: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '700', color: C.navy },
  foodQuantity: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.tealMuted, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4,
  },
  qtyBtn: { padding: 4 },
  qtyValue: { fontSize: 14, fontWeight: '700', color: C.teal, minWidth: 32, textAlign: 'center' },
  foodCals: { fontSize: 14, fontWeight: '700', color: C.teal, minWidth: 44, textAlign: 'right' },
  gramsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5,
  },
  gramsInput: {
    flex: 1, height: 28, backgroundColor: '#F1F5F9', borderRadius: 8,
    paddingHorizontal: 8, fontSize: 12, color: C.textPrimary,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  gramsInputActive: {
    backgroundColor: C.tealMuted, borderColor: C.tealLight,
    color: C.tealDark, fontWeight: '700',
  },
  modalFooter: { marginTop: 16, gap: 12 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.tealMuted, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
  totalCals: { fontSize: 20, fontWeight: '800', color: C.teal },
  confirmBtn: {
    backgroundColor: C.teal, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});

