export type PersonalTarget = {
  systolic: number;
  diastolic: number;
  protocolEnabled: boolean;
  /** Personal "below this" glucose goal in canonical mg/dL. Not a diagnosis. */
  glucoseMgdl: number;
};

export const DEFAULT_TARGET: PersonalTarget = {
  systolic: 130,
  diastolic: 80,
  protocolEnabled: true,
  glucoseMgdl: 100,
};

export const TARGET_STORAGE_KEY = 'bp_personal_target_v1';

export function isInTarget(
  systolic: number,
  diastolic: number,
  target: Pick<PersonalTarget, 'systolic' | 'diastolic'>
): boolean {
  return systolic < target.systolic && diastolic < target.diastolic;
}

export function isGlucoseInTarget(
  valueMgdl: number,
  target: Pick<PersonalTarget, 'glucoseMgdl'>
): boolean {
  return valueMgdl < target.glucoseMgdl;
}

export function targetHitRate(
  readings: Array<{ systolic: number; diastolic: number }>,
  target: Pick<PersonalTarget, 'systolic' | 'diastolic'>
): { hit: number; total: number; percent: number | null } {
  const total = readings.length;
  if (total === 0) return { hit: 0, total: 0, percent: null };
  const hit = readings.filter((r) => isInTarget(r.systolic, r.diastolic, target)).length;
  return { hit, total, percent: Math.round((hit / total) * 100) };
}

export function glucoseTargetHitRate(
  readings: Array<{ valueMgdl: number }>,
  target: Pick<PersonalTarget, 'glucoseMgdl'>
): { hit: number; total: number; percent: number | null } {
  const total = readings.length;
  if (total === 0) return { hit: 0, total: 0, percent: null };
  const hit = readings.filter((r) => isGlucoseInTarget(r.valueMgdl, target)).length;
  return { hit, total, percent: Math.round((hit / total) * 100) };
}

export function parseGlucoseTargetMgdl(
  raw: string
): { ok: true; value: number } | { ok: false; error: string } {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'Glucose target must be a number' };
  }
  if (value < 70 || value > 200) {
    return { ok: false, error: 'Glucose target must be between 70 and 200 mg/dL' };
  }
  return { ok: true, value };
}

export function parseTargetValue(
  raw: string,
  field: 'systolic' | 'diastolic'
): { ok: true; value: number } | { ok: false; error: string } {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    return { ok: false, error: `${field === 'systolic' ? 'Systolic' : 'Diastolic'} must be a number` };
  }
  if (field === 'systolic' && (value < 90 || value > 200)) {
    return { ok: false, error: 'Systolic target must be between 90 and 200' };
  }
  if (field === 'diastolic' && (value < 50 || value > 130)) {
    return { ok: false, error: 'Diastolic target must be between 50 and 130' };
  }
  return { ok: true, value };
}

export function parseStoredTarget(raw: string | null): PersonalTarget {
  if (!raw) return { ...DEFAULT_TARGET };
  try {
    const parsed = JSON.parse(raw) as Partial<PersonalTarget>;
    const sys = typeof parsed.systolic === 'number' ? parsed.systolic : DEFAULT_TARGET.systolic;
    const dia = typeof parsed.diastolic === 'number' ? parsed.diastolic : DEFAULT_TARGET.diastolic;
    const glu =
      typeof parsed.glucoseMgdl === 'number' ? parsed.glucoseMgdl : DEFAULT_TARGET.glucoseMgdl;
    const sysOk = parseTargetValue(String(sys), 'systolic');
    const diaOk = parseTargetValue(String(dia), 'diastolic');
    const gluOk = parseGlucoseTargetMgdl(String(glu));
    return {
      systolic: sysOk.ok ? sysOk.value : DEFAULT_TARGET.systolic,
      diastolic: diaOk.ok ? diaOk.value : DEFAULT_TARGET.diastolic,
      protocolEnabled: parsed.protocolEnabled !== false,
      glucoseMgdl: gluOk.ok ? gluOk.value : DEFAULT_TARGET.glucoseMgdl,
    };
  } catch {
    return { ...DEFAULT_TARGET };
  }
}
