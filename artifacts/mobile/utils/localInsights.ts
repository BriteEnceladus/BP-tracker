import type { BPReading } from '../src/schemas';
import { getBPCategory, getReadingsForDays, getAverages, type BPCategory } from './bpUtils';

export type TrendDirection = 'improving' | 'stable' | 'rising' | 'insufficient';

export interface LocalInsightInput {
  latest: {
    systolic: number;
    diastolic: number;
    heartRate?: number;
    medicationTaken?: boolean;
  };
  recentReadings: BPReading[];
  hasActiveMedications?: boolean;
}

export interface LocalInsightResult {
  title: string;
  bullets: string[];
  disclaimer: string;
  category: BPCategory;
  trend: TrendDirection;
}

const DISCLAIMER =
  'This is not medical advice. Discuss your readings with a qualified clinician.';

function getTrend(readings: BPReading[]): TrendDirection {
  if (readings.length < 3) return 'insufficient';

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

  const avg = (list: BPReading[]) => {
    const sys = list.reduce((s, r) => s + r.systolic, 0) / list.length;
    const dia = list.reduce((s, r) => s + r.diastolic, 0) / list.length;
    return { sys, dia };
  };

  const early = avg(firstHalf);
  const late = avg(secondHalf);

  const sysDelta = late.sys - early.sys;
  const diaDelta = late.dia - early.dia;

  if (sysDelta <= -5 || diaDelta <= -3) return 'improving';
  if (sysDelta >= 5 || diaDelta >= 3) return 'rising';
  return 'stable';
}

type InsightKey = `${BPCategory}_${TrendDirection}`;

const CARDS: Record<InsightKey, { title: string; bullets: string[] }> = {
  normal_improving: {
    title: 'Looking good',
    bullets: [
      'Your latest reading is in the Normal range.',
      'Recent readings are trending in a favorable direction.',
      'Keep the habits that are working — consistent sleep, movement, and lower sodium are common helpers.',
    ],
  },
  normal_stable: {
    title: 'Steady and normal',
    bullets: [
      'Your latest reading is in the Normal range.',
      'Your recent averages look stable.',
      'Continue regular checks so you notice any future changes early.',
    ],
  },
  normal_rising: {
    title: 'Normal for now — watch the trend',
    bullets: [
      'Your latest reading is still in the Normal range.',
      'Recent readings are drifting upward. This is worth noticing.',
      'Consider reviewing sodium, stress, alcohol, and sleep over the next week.',
    ],
  },
  normal_insufficient: {
    title: 'Normal reading',
    bullets: [
      'Your latest reading is in the Normal range.',
      'Log a few more readings over the coming days to see a clearer trend.',
    ],
  },
  elevated_improving: {
    title: 'Elevated, but improving',
    bullets: [
      'Your latest reading is in the Elevated range (systolic 120–129 and diastolic under 80).',
      'Recent readings are moving in a better direction — keep going.',
      'Lifestyle focus usually helps most at this stage: activity, sodium, weight if relevant, and stress.',
    ],
  },
  elevated_stable: {
    title: 'Elevated range',
    bullets: [
      'Your latest reading is Elevated.',
      'Recent averages are fairly steady in this range.',
      'Many people improve elevated readings with consistent lifestyle changes. Discuss a plan with your clinician if this continues.',
    ],
  },
  elevated_rising: {
    title: 'Elevated and rising',
    bullets: [
      'Your latest reading is Elevated and the recent trend is upward.',
      'This is a good time to review habits and talk with a clinician before numbers move higher.',
      'Track at consistent times of day for clearer information.',
    ],
  },
  elevated_insufficient: {
    title: 'Elevated reading',
    bullets: [
      'Your latest reading is in the Elevated range.',
      'A few more readings will help show whether this is a pattern or a one-off.',
    ],
  },
  stage1_improving: {
    title: 'Stage 1 — improving',
    bullets: [
      'Your latest reading falls in High Blood Pressure Stage 1.',
      'The recent trend is improving, which is encouraging.',
      'Continue whatever is helping and keep your clinician informed of the progress.',
    ],
  },
  stage1_stable: {
    title: 'Stage 1 hypertension range',
    bullets: [
      'Your latest reading is in High Blood Pressure Stage 1.',
      'Recent readings are fairly consistent in this range.',
      'Guidelines often recommend lifestyle changes and a conversation with a clinician about next steps.',
    ],
  },
  stage1_rising: {
    title: 'Stage 1 — rising trend',
    bullets: [
      'Your latest reading is Stage 1 and recent numbers are trending higher.',
      'Share this pattern with your clinician — earlier discussion is usually better.',
      'Keep measuring at consistent times and note any symptoms.',
    ],
  },
  stage1_insufficient: {
    title: 'Stage 1 reading',
    bullets: [
      'Your latest reading is in High Blood Pressure Stage 1.',
      'Log additional readings over the next several days so you and your clinician can see the pattern.',
    ],
  },
  stage2_improving: {
    title: 'Stage 2 — some improvement',
    bullets: [
      'Your latest reading is in High Blood Pressure Stage 2.',
      'There are signs of improvement in recent readings, which is positive.',
      'Stay in close contact with your clinician and continue prescribed treatment and lifestyle measures.',
    ],
  },
  stage2_stable: {
    title: 'Stage 2 range',
    bullets: [
      'Your latest reading is in High Blood Pressure Stage 2.',
      'Recent readings remain in a higher range.',
      'Contact your clinician to review your plan — Stage 2 usually needs prompt professional guidance.',
    ],
  },
  stage2_rising: {
    title: 'Stage 2 — rising',
    bullets: [
      'Your latest reading is Stage 2 and the trend is upward.',
      'Please contact your clinician promptly to review these numbers.',
      'Do not ignore symptoms such as severe headache, chest pain, or shortness of breath.',
    ],
  },
  stage2_insufficient: {
    title: 'Stage 2 reading',
    bullets: [
      'Your latest reading is in High Blood Pressure Stage 2.',
      'This range generally warrants a timely conversation with a clinician.',
      'Continue logging so you have a clear record to share.',
    ],
  },
  crisis_improving: {
    title: 'Hypertensive crisis range',
    bullets: [
      'Your latest reading meets hypertensive crisis criteria (very high).',
      'Even if other recent readings look better, a reading in this range needs urgent clinical attention.',
      'Seek emergency care if you have chest pain, shortness of breath, back pain, numbness, vision changes, or difficulty speaking.',
    ],
  },
  crisis_stable: {
    title: 'Hypertensive crisis range',
    bullets: [
      'Your latest reading is in the hypertensive crisis range.',
      'This is a medical urgency. Contact a clinician or emergency services now, especially if you have symptoms.',
      'Do not wait for more readings before seeking help.',
    ],
  },
  crisis_rising: {
    title: 'Hypertensive crisis range',
    bullets: [
      'Your latest reading is in the hypertensive crisis range and recent trend is higher.',
      'Seek emergency medical care promptly.',
      'Call emergency services if you have severe symptoms.',
    ],
  },
  crisis_insufficient: {
    title: 'Hypertensive crisis range',
    bullets: [
      'Your latest reading meets hypertensive crisis criteria.',
      'Seek medical care now rather than waiting to collect more data.',
      'If you have symptoms such as chest pain, severe headache, or shortness of breath, call emergency services.',
    ],
  },
};

function buildMedsBullet(
  latestTaken: boolean | undefined,
  hasActiveMeds: boolean | undefined
): string | null {
  if (!hasActiveMeds) return null;
  if (latestTaken === true) {
    return 'You marked medication as taken with this reading — useful context for your clinician.';
  }
  if (latestTaken === false) {
    return 'Medication was not marked as taken for this reading. Consistent timing often matters.';
  }
  return null;
}

export function generateLocalInsight(input: LocalInsightInput): LocalInsightResult {
  const category = getBPCategory(input.latest.systolic, input.latest.diastolic);
  const last7 = getReadingsForDays(input.recentReadings, 7);
  const trend = getTrend(last7.length >= 3 ? last7 : input.recentReadings);

  const key: InsightKey = `${category}_${trend}`;
  const card = CARDS[key] ?? CARDS[`${category}_insufficient` as InsightKey];

  const bullets = [...card.bullets];

  const averages = getAverages(last7);
  if (last7.length >= 3 && averages.avgSystolic && averages.avgDiastolic) {
    bullets.push(
      `7-day average (from your logs): ${averages.avgSystolic}/${averages.avgDiastolic} mmHg across ${last7.length} readings.`
    );
  }

  const medsBullet = buildMedsBullet(input.latest.medicationTaken, input.hasActiveMedications);
  if (medsBullet) bullets.push(medsBullet);

  return {
    title: card.title,
    bullets,
    disclaimer: DISCLAIMER,
    category,
    trend,
  };
}

export function formatLocalInsightText(result: LocalInsightResult): string {
  const lines = [
    result.title,
    '',
    ...result.bullets.map((b) => `• ${b}`),
    '',
    result.disclaimer,
  ];
  return lines.join('\n');
}
