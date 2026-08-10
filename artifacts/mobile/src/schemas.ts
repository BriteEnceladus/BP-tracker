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
 * Used for validation on load / after decryption.
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

/**
 * Input schema for creating/updating a reading (from forms).
 * Omits server-managed fields.
 */
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
 * Encrypted payload structure (versioned for future migrations).
 */
export const EncryptedPayloadSchema = z.object({
  v: z.literal(1), // version
  iv: z.string().min(1),
  payload: z.string().min(1),
  // Future: could add 'alg', 'kdf' etc. for key rotation
});

export type EncryptedPayload = z.infer<typeof EncryptedPayloadSchema>;

/**
 * Password schema for setup/unlock.
 */
export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password is too long');

/**
 * Helper to parse with nice errors for UI.
 */
export function parseWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map(issue => {
    const path = issue.path.length ? issue.path.join('.') : 'value';
    return `${path}: ${issue.message}`;
  });
  return { success: false, errors };
}
