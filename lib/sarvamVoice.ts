// lib/sarvamVoice.ts
// Sarvam AI Voice Agent — WebSocket manager
// Sarvam handles ALL of: STT, LLM, TTS.
// We stream audio bytes TO Sarvam, and receive + play audio bytes FROM Sarvam.

import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';

const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY ?? '';
const SARVAM_ORG_ID = process.env.EXPO_PUBLIC_SARVAM_ORG_ID ?? '';
const SARVAM_WORKSPACE_ID = process.env.EXPO_PUBLIC_SARVAM_WORKSPACE_ID ?? '';
const SARVAM_APP_ID = process.env.EXPO_PUBLIC_SARVAM_APP_ID ?? '';
const SARVAM_APP_VERSION = parseInt(process.env.EXPO_PUBLIC_SARVAM_APP_VERSION ?? '2');

// Sarvam app-runtime WebSocket (same backend used by sarvamconv_ai_sdk Flutter SDK)
const SARVAM_WS_BASE = 'wss://apps.sarvam.ai/api/app-runtime';

export type VoiceAgentStatus =
  | 'idle' | 'connecting' | 'connected'
  | 'listening' | 'processing' | 'speaking'
  | 'ended' | 'error';

export type VoiceAgentCallbacks = {
  onStatusChange: (status: VoiceAgentStatus) => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onAgentText: (text: string) => void;
  onError: (error: string) => void;
};

export class SarvamVoiceAgent {
  private ws: WebSocket | null = null;
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private callbacks: VoiceAgentCallbacks;
  private userIdentifier: string;
  private agentVariables: Record<string, string>;
  private status: VoiceAgentStatus = 'idle';
  private audioChunkInterval: ReturnType<typeof setInterval> | null = null;
  private lastSentSize = 0;

  constructor(opts: {
    userIdentifier: string;
    agentVariables?: Record<string, string>;
    callbacks: VoiceAgentCallbacks;
  }) {
    this.userIdentifier = opts.userIdentifier;
    this.agentVariables = opts.agentVariables ?? {};
    this.callbacks = opts.callbacks;
  }

  private setStatus(s: VoiceAgentStatus) {
    this.status = s;
    this.callbacks.onStatusChange(s);
  }

  async connect() {
    if (this.ws) return;

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      this.callbacks.onError('Microphone permission denied');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    this.setStatus('connecting');

    const wsUrl = `${SARVAM_WS_BASE}/${SARVAM_ORG_ID}/${SARVAM_WORKSPACE_ID}/${SARVAM_APP_ID}`;

    // ── Debug: log credentials being used ────────────────────────────────────
    console.log('[SarvamVoice] Connecting to:', wsUrl);
    console.log('[SarvamVoice] API key prefix:', SARVAM_API_KEY?.slice(0, 20) || '(empty!)');
    console.log('[SarvamVoice] ORG_ID:', SARVAM_ORG_ID || '(empty!)');
    console.log('[SarvamVoice] WORKSPACE_ID:', SARVAM_WORKSPACE_ID || '(empty!)');
    console.log('[SarvamVoice] APP_ID:', SARVAM_APP_ID || '(empty!)');
    console.log('[SarvamVoice] APP_VERSION:', SARVAM_APP_VERSION);

    if (!SARVAM_API_KEY || !SARVAM_ORG_ID || !SARVAM_WORKSPACE_ID || !SARVAM_APP_ID) {
      const missing = [
        !SARVAM_API_KEY && 'SARVAM_API_KEY',
        !SARVAM_ORG_ID && 'SARVAM_ORG_ID',
        !SARVAM_WORKSPACE_ID && 'SARVAM_WORKSPACE_ID',
        !SARVAM_APP_ID && 'SARVAM_APP_ID',
      ].filter(Boolean).join(', ');
      this.callbacks.onError(`Missing Sarvam config: ${missing}`);
      this.setStatus('error');
      return;
    }

    try {
      this.ws = new WebSocket(wsUrl, [`api-subscription-key.${SARVAM_API_KEY}`]);
    } catch (e) {
      console.error('[SarvamVoice] WebSocket constructor error:', e);
      this.callbacks.onError('Failed to connect to voice agent');
      this.setStatus('error');
      return;
    }

    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      console.log('[SarvamVoice] WebSocket opened — sending interaction.start');
      this.ws?.send(JSON.stringify({
        type: 'interaction.start',
        interaction: { type: 'call', sample_rate: 16000, app_version: SARVAM_APP_VERSION },
        user: { identifier: this.userIdentifier, identifier_type: 'custom' },
        agent_variables: this.agentVariables,
      }));
    };

    this.ws.onmessage = async (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        this._handleTextMessage(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        await this._playAudioBuffer(event.data);
      }
    };

    this.ws.onerror = (event: Event) => {
      console.error('[SarvamVoice] WebSocket error event:', event);
      this.callbacks.onError('Voice connection error. Please try again.');
      this.setStatus('error');
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.warn(
        `[SarvamVoice] WebSocket closed — code=${event.code} reason=${event.reason || '(none)'} wasClean=${event.wasClean}`,
      );
      if (this.status !== 'error') this.setStatus('ended');
      this._stopRecording();
    };
  }

  private _handleTextMessage(raw: string) {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw) as Record<string, unknown>; } catch { return; }

    switch (msg['type']) {
      case 'interaction.connected':
        this.setStatus('connected');
        void this._startRecording();
        break;
      case 'interaction.end':
        this.setStatus('ended');
        void this.disconnect();
        break;
      case 'user.speech.start': this.setStatus('listening'); break;
      case 'user.speech.end': this.setStatus('processing'); break;
      case 'agent.speaking.start': this.setStatus('speaking'); break;
      case 'agent.speaking.end': this.setStatus('listening'); break;
      case 'transcript.partial':
        if (msg['text']) this.callbacks.onTranscript(msg['text'] as string, false);
        break;
      case 'transcript.final':
        if (msg['text']) this.callbacks.onTranscript(msg['text'] as string, true);
        break;
      case 'agent.text.chunk':
      case 'agent.text':
        if (msg['text']) this.callbacks.onAgentText(msg['text'] as string);
        break;
      case 'error':
        this.callbacks.onError((msg['message'] as string | undefined) ?? 'Agent error');
        this.setStatus('error');
        break;
    }
  }

  private async _startRecording() {
    try {
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });
      await this.recording.startAsync();
      this.lastSentSize = 0;
      this.setStatus('listening');

      // Stream incremental audio bytes every 150ms
      this.audioChunkInterval = setInterval(() => void this._streamAudioDelta(), 150);
    } catch (e) {
      console.error('[SarvamVoice] Recording start error:', e);
      this.callbacks.onError('Could not access microphone.');
    }
  }

  private async _streamAudioDelta() {
    if (!this.recording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const uri = this.recording.getURI();
      if (!uri) return;

      // Use new expo-file-system File class
      const file = new File(uri);
      if (!file.exists) return;
      
      const buf = await file.arrayBuffer();
      if (buf.byteLength <= this.lastSentSize) return;

      // Send only the new bytes since last send
      const newBytes = buf.slice(this.lastSentSize);
      this.lastSentSize = buf.byteLength;
      this.ws.send(newBytes);
    } catch {
      // skip — file may still be open/writing
    }
  }

  private async _stopRecording() {
    if (this.audioChunkInterval) {
      clearInterval(this.audioChunkInterval);
      this.audioChunkInterval = null;
    }
    if (this.recording) {
      try { await this.recording.stopAndUnloadAsync(); } catch {}
      this.recording = null;
    }
    this.lastSentSize = 0;
  }

  private async _playAudioBuffer(buffer: ArrayBuffer) {
    try {
      // Write received TTS audio to a temp cache file
      const tempFile = new File(Paths.cache, `sarvam_tts_${Date.now()}.wav`);
      
      // Write as Uint8Array
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 1024;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      // Use base64 write via the legacy compatible path
      const base64 = btoa(binary);
      
      // Fallback: use a data URI approach since new API may not support write
      const uri = `data:audio/wav;base64,${base64}`;

      if (this.sound) {
        await this.sound.unloadAsync().catch(() => {});
        this.sound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      this.sound = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          this.sound = null;
        }
      });
    } catch (e) {
      console.warn('[SarvamVoice] Playback error:', e);
    }
  }

  interrupt() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'user.interrupt' }));
    }
    this.sound?.stopAsync().catch(() => {});
  }

  async disconnect() {
    await this._stopRecording();
    if (this.sound) {
      await this.sound.unloadAsync().catch(() => {});
      this.sound = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.status !== 'error' && this.status !== 'ended') this.setStatus('idle');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }

  getStatus() { return this.status; }
}
