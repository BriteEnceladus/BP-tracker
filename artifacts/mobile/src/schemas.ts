import { z } from 'zod';

/**
 * Zod schemas for BP Tracker.
 * All runtime validation + inferred TS types live here for consistency.
 */

// Blood pressure ranges based on medical guidelines (mmHg)
export const SystolicSchema = z
  .number()
  .int('Systolic must be an integer')
  .min(50, 'Systolic must be at least 50 mmHg')
  .max(300, 'Systolic must be at most 300 mmHg');

export const DiastolicSchema = z
  .number()
  .int('Diastolic must be an integer')
  .min(30, 'Diastolic must be at least 30 mmHg')
  .max(200, 'Diastolic must be at most 200 mmHg');

export const HeartRateSchema = z
  .number()
  .int('Heart rate must be an integer')
  .min(30, 'Heart rate must be at least 30 bpm')
  .max(250, 'Heart rate must be at most 250 bpm')
  .optional();

export const NotesSchema = z
  .string()
  .trim()
  .max(500, 'Notes must be 500 characters or less')
  .optional();

export const MedicationTakenSchema = z.boolean().optional();

export const TimestampSchema = z
  .string()
  .datetime({ message: 'Timestamp must be a valid ISO 8601 datetime string' });

/**
 * Core BPReading schema (for stored data).
 */
export const BPReadingSchema = z.object({
  id: z.number().int().optional(),
  timestamp: TimestampSchema,
  systolic: SystolicSchema,
  diastolic: DiastolicSchema,
  heartRate: HeartRateSchema,
  notes: NotesSchema,
  medicationTaken: MedicationTakenSchema,
  createdAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema.optional(),
});

export type BPReading = z.infer<typeof BPReadingSchema>;

export const BPReadingInputSchema = z.object({
  timestamp: TimestampSchema,
  systolic: SystolicSchema,
  diastolic: DiastolicSchema,
  heartRate: HeartRateSchema,
  notes: NotesSchema,
  medicationTaken: MedicationTakenSchema,
});

export type BPReadingInput = z.infer<typeof BPReadingInputSchema>;

/**
 * Medication schema
 */
export const MedicationSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  dosage: z.string().trim().min(1, 'Dosage is required').max(50),
  frequency: z.string().trim().min(1, 'Frequency is required').max(80),
  startDate: z.string().optional(), // ISO date YYYY-MM-DD
  notes: z.string().trim().max(300).optional(),
  active: z.boolean().default(true),
  createdAt: TimestampSchema.optional(),
  updatedAt: TimestampSchema.optional(),
});

export type Medication = z.infer<typeof MedicationSchema>;

export const MedicationInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  dosage: z.string().trim().min(1, 'Dosage is required').max(50),
  frequency: z.string().trim().min(1, 'Frequency is required').max(80),
  startDate: z.string().optional(),
  notes: z.string().trim().max(300).optional(),
  active: z.boolean().default(true),
});

export type MedicationInput = z.infer<typeof MedicationInputSchema>;

export const EncryptedPayloadSchema = z.object({
  v: z.literal(1),
  iv: z.string().min(1),
  payload: z.string().min(1),
});

export type EncryptedPayload = z.infer<typeof EncryptedPayloadSchema>;

export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password is too long');

export function parseWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'value';
    return `${path}: ${issue.message}`;
  });
  return { success: false, errors };
}
