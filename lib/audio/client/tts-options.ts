export const PRIMARY_MODELS = [
  { id: 'speech-2.8-hd', name: '高清旗舰', description: '音质最佳，情绪饱满，融合语气词，听感自然' },
  { id: 'speech-2.8-turbo', name: '极速旗舰', description: '生成更快，音频自然逼真，适合长文本' },
  { id: 'speech-2.6-hd', name: '高清标准', description: '超低延时，高自然度' },
  { id: 'speech-2.6-turbo', name: '极速标准', description: '更快更经济，适合语音聊天场景' },
] as const;

export const LANGUAGES = [
  { code: 'auto', name: '自动识别' },
  { code: 'Chinese', name: '中文' },
  { code: 'Chinese,Yue', name: '粤语' },
  { code: 'English', name: 'English' },
  { code: 'Japanese', name: '日本語' },
  { code: 'Korean', name: '한국어' },
  { code: 'Spanish', name: 'Español' },
  { code: 'French', name: 'Français' },
  { code: 'German', name: 'Deutsch' },
  { code: 'Russian', name: 'Русский' },
  { code: 'Italian', name: 'Italiano' },
  { code: 'Portuguese', name: 'Português' },
  { code: 'Arabic', name: 'العربية' },
  { code: 'Thai', name: 'ไทย' },
  { code: 'Vietnamese', name: 'Tiếng Việt' },
  { code: 'Indonesian', name: 'Bahasa Indonesia' },
  { code: 'Turkish', name: 'Türkçe' },
  { code: 'Dutch', name: 'Nederlands' },
  { code: 'Polish', name: 'Polski' },
  { code: 'Hindi', name: 'हिन्दी' },
] as const;

export const DEFAULT_TTS_MODEL = 'speech-2.8-hd';
export const DEFAULT_TTS_VOICE = 'male-qn-qingse';
export const CLONE_PREVIEW_MODEL = 'speech-2.8-hd';

export const SPEECH_MODEL_IDS: ReadonlySet<string> = new Set(PRIMARY_MODELS.map((model) => model.id));

export function isSupportedSpeechModel(model: unknown): model is string {
  return typeof model === 'string' && SPEECH_MODEL_IDS.has(model);
}
