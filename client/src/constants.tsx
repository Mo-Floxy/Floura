import { Smile, Frown, Flame, Wind, Zap, Heart, CloudRain, BatteryLow, Cloudy } from 'lucide-react';

export const SYMPTOMS = [
  'Cramps', 'Headaches', 'Acne', 'Bloating', 'Breast tenderness', 'Back pain',
  'Fatigue', 'Nausea', 'Cravings', 'Insomnia', 'Discharge changes',
];

export const MOOD_OPTIONS = [
  { name: 'Happy', icon: Smile, color: '#E9B44C' },
  { name: 'Sad', icon: CloudRain, color: '#8CA8C9' },
  { name: 'Anxious', icon: Wind, color: '#B9A3D6' },
  { name: 'Irritated', icon: Flame, color: '#E08B78' },
  { name: 'Calm', icon: Heart, color: '#8FC2A6' },
  { name: 'Energetic', icon: Zap, color: '#D98BA6' },
  { name: 'Emotional', icon: Cloudy, color: '#C79BC7' },
  { name: 'Stressed', icon: CloudRain, color: '#A78B8B' },
  { name: 'Tired', icon: BatteryLow, color: '#9D9AAE' },
];

export const SEVERITIES = [
  { value: 'mild', label: 'Mild', color: '#A8CFB4' },
  { value: 'moderate', label: 'Moderate', color: '#E9B44C' },
  { value: 'severe', label: 'Severe', color: '#D97A7A' },
] as const;

export const PHASE_META: Record<string, { label: string; icon: string; color: string; short: string }> = {
  menstrual: { label: 'Menstrual phase', icon: '🌸', color: '#D98BA6', short: 'Period' },
  follicular: { label: 'Follicular phase', icon: '🌿', color: '#8FC2A6', short: 'Follicular' },
  fertile: { label: 'Fertile window', icon: '✨', color: '#B9A3D6', short: 'Fertile' },
  ovulation: { label: 'Ovulation day', icon: '🌟', color: '#E9B44C', short: 'Ovulation' },
  luteal: { label: 'Luteal phase', icon: '🌙', color: '#C79BC7', short: 'Luteal' },
  unknown: { label: 'Getting started', icon: '🌷', color: '#B9A3D6', short: 'New' },
};

export const ACTIVITIES = ['Walking', 'Yoga', 'Stretching', 'Cycling', 'Running', 'Strength training', 'Swimming', 'Dance', 'Other'];
export const CRAVINGS = ['Chocolate', 'Sweet', 'Salty', 'Carbs', 'Dairy', 'Coffee', 'Spicy', 'Fruit'];
export const SLEEP_QUALITIES = [
  { value: 'poor', label: 'Poor' }, { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' }, { value: 'excellent', label: 'Excellent' },
];

export const WELLNESS_TIPS = [
  { category: 'Nourish', text: 'Iron-rich foods such as leafy greens, lentils and pumpkin seeds help replenish what is lost during your period.' },
  { category: 'Move gently', text: 'A slow walk or gentle stretching can ease cramps by improving blood flow to the pelvic area.' },
  { category: 'Hydrate', text: 'Sipping water steadily through the day supports energy levels and helps reduce bloating.' },
  { category: 'Rest', text: 'Your energy needs change across your cycle. It is okay to slow down during your period.' },
  { category: 'Warmth', text: 'A warm compress on the lower abdomen can be as effective as some pain relief for cramping.' },
  { category: 'Mindful', text: 'Noticing patterns in your mood and symptoms can help you plan kinder, more realistic days.' },
  { category: 'Sleep', text: 'Keeping a consistent bedtime supports hormone balance and a steadier mood through your cycle.' },
  { category: 'Know your body', text: 'A little variation is normal. Tracking over several cycles tells you what is normal for you.' },
  { category: 'Fibre', text: ' fibre from whole grains, fruit and vegetables can help keep digestion comfortable during your period.' },
  { category: 'Connect', text: 'If symptoms feel overwhelming, talking to someone you trust can help you feel less alone.' },
].map((tip) => ({ ...tip, text: tip.text.trim() }));

export const REMINDER_META: Record<string, { title: string; description: string; icon: string }> = {
  period: { title: 'Upcoming period', description: 'A gentle heads-up before your predicted period.', icon: 'calendar' },
  ovulation: { title: 'Expected ovulation', description: 'A reminder around your estimated ovulation day.', icon: 'sparkle' },
  fertile: { title: 'Fertile window', description: 'Know when your fertile days are approaching.', icon: 'flower' },
  medication: { title: 'Medication', description: 'A daily nudge for medication or supplements.', icon: 'pill' },
  water: { title: 'Drink water', description: 'Stay on top of your daily hydration goal.', icon: 'droplet' },
  log: { title: 'Log your symptoms', description: 'Build a clearer picture with a daily check-in.', icon: 'notebook' },
};

/** Colours used across the cycle calendar. */
export const CALENDAR_LEGEND = [
  { key: 'period', label: 'Period', color: 'var(--period)' },
  { key: 'predicted', label: 'Predicted period', color: 'var(--predicted)' },
  { key: 'fertile', label: 'Fertile window', color: 'var(--fertile)' },
  { key: 'ovulation', label: 'Ovulation', color: 'var(--ovulation)' },
  { key: 'today', label: 'Today', color: 'var(--primary)' },
];
