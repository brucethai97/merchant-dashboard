import { TIMEZONE_OPTION_IDS } from "@/lib/timezone-select-options";
import * as z from "zod";

function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Strip formatting; if 11 digits starting with 1 (US +1), keep the last 10. */
function normalizeUsPhoneDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits;
}

export const storeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name must be at most 200 characters"),
  street: z
    .string()
    .trim()
    .min(1, "Street is required")
    .max(300, "Street must be at most 300 characters"),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City must be at most 100 characters"),
  state: z
    .string()
    .trim()
    .min(2, "State must be at least 2 characters")
    .max(32, "State must be at most 32 characters")
    .regex(
      /^[a-zA-Z\s.'-]+$/,
      "State may only contain letters, spaces, periods, apostrophes, and hyphens",
    ),
  zip_code: z
    .string()
    .trim()
    .regex(
      /^\d{5}(-\d{4})?$/,
      "Use a valid US ZIP (5 digits or 5+4, e.g. 94102 or 94102-1234)",
    ),
  phone: z
    .string()
    .trim()
    .transform((val) => normalizeUsPhoneDigits(val))
    .pipe(
      z
        .string()
        .length(
          10,
          "Enter a valid 10-digit US number (optional +1 country code)",
        ),
    ),
  timezone: z
    .string()
    .trim()
    .min(1, "Select a time zone")
    .refine(
      (tz) => TIMEZONE_OPTION_IDS.has(tz) || isValidIanaTimeZone(tz),
      { message: "Select a valid time zone" },
    ),
  is_active: z.boolean(),
});

export type StoreFormValues = z.infer<typeof storeFormSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .email("Invalid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((v) => {
      const n = Number.parseFloat(v);
      return !Number.isNaN(n) && n >= 0;
    }, "Enter a valid price (0 or greater)"),
  is_available: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;


export const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your display name")
    .max(120, "Display name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .email("Invalid email address"),
  password: z.string().min(1, "Enter your password"),
  confirmPassword: z.string().min(1, "Confirm your password"),
});

export type SignupValues = z.infer<typeof signupSchema>;