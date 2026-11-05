import { z } from 'zod';

/**
 * Shared validation schemas.
 *
 * The SAME schema runs in the browser (instant feedback) and on the server
 * (authoritative). Never trust the client: every route handler re-parses.
 */

/** Algerian mobile/landline numbers: 0X XX XX XX XX, +213…, 00213…, spaces allowed. */
const PHONE_RE = /^(?:\+213|00213|0)[1-9](?:[\s.-]?\d){7,8}$/;

export function normalisePhone(input: string): string {
  const digits = input.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+213')) return `0${digits.slice(4)}`;
  if (digits.startsWith('00213')) return `0${digits.slice(5)}`;
  if (digits.startsWith('213') && digits.length === 12) return `0${digits.slice(3)}`;
  return digits;
}

/** Strips control characters and collapses runaway whitespace (XSS defence). */
export function sanitiseText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export const inquirySchema = z.object({
  fullName: z
    .string()
    .transform(sanitiseText)
    .refine((v) => v.length >= 3, { message: 'form.nameTooShort' })
    .refine((v) => v.length <= 120, { message: 'form.nameTooShort' }),
  phone: z
    .string()
    .transform((v) => normalisePhone(v))
    .refine((v) => PHONE_RE.test(v), { message: 'form.phoneInvalid' }),
  email: z
    .string()
    .transform(sanitiseText)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), {
      message: 'form.emailInvalid',
    })
    .optional()
    .default(''),
  message: z
    .string()
    .transform(sanitiseText)
    .refine((v) => v.length >= 10, { message: 'form.messageTooShort' })
    .refine((v) => v.length <= 2000, { message: 'form.messageTooLong' }),
  preferredChannel: z.enum(['phone', 'whatsapp', 'email']).default('phone'),
  locale: z.enum(['fr', 'ar']).default('fr'),
  type: z.enum(['property', 'vehicle', 'general', 'reservation']).default('general'),
  propertyId: z.string().max(64).optional(),
  vehicleId: z.string().max(64).optional(),
  preferredDate: z
    .string()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'form.dateInvalid' })
    .optional()
    .default(''),
  startDate: z
    .string()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'form.dateInvalid' })
    .optional()
    .default(''),
  endDate: z
    .string()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'form.dateInvalid' })
    .optional()
    .default(''),
  consent: z
    .union([z.boolean(), z.literal('on'), z.literal('true')])
    .transform((v) => v === true || v === 'on' || v === 'true')
    .refine((v) => v, { message: 'form.consentRequired' }),
  /** Honeypot: real users never fill this hidden field. */
  website: z.string().max(0).optional().default(''),
});

export type InquiryInput = z.input<typeof inquirySchema>;
export type InquiryPayload = z.output<typeof inquirySchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'auth.invalidCredentials' }),
  password: z.string().min(1, { message: 'auth.invalidCredentials' }).max(200),
});

/** Listing write payloads (admin). Coordinates are optional but all-or-nothing. */
const coordinatePair = {
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
};

export const propertyWriteSchema = z
  .object({
    titleFr: z.string().transform(sanitiseText).refine((v) => v.length >= 3, { message: 'admin.validation.titleRequired' }),
    titleAr: z.string().transform(sanitiseText).refine((v) => v.length >= 3, { message: 'admin.validation.titleRequired' }),
    descriptionFr: z.string().transform(sanitiseText).default(''),
    descriptionAr: z.string().transform(sanitiseText).default(''),
    category: z.enum(['apartment', 'studio', 'villa', 'house', 'commercial', 'land', 'office']),
    transaction: z.enum(['rent_annual', 'rent_short', 'sale', 'exchange']),
    price: z.number().int().min(0),
    priceUnit: z.enum(['month', 'night', 'total']),
    communeSlug: z.string().min(1, { message: 'admin.validation.communeRequired' }),
    addressFr: z.string().transform(sanitiseText).default(''),
    addressAr: z.string().transform(sanitiseText).default(''),
    ...coordinatePair,
    coordinatePrecision: z.enum(['exact', 'approximate', 'commune', 'pending']).default('pending'),
    surface: z.number().int().min(0).default(0),
    bedrooms: z.number().int().min(0).default(0),
    bathrooms: z.number().int().min(0).default(0),
    floor: z.number().int().min(-5).max(200).nullable().optional(),
    furnishing: z.enum(['furnished', 'unfurnished', 'semi_furnished']).default('unfurnished'),
    amenities: z.array(z.string().transform(sanitiseText)).default([]),
    availabilityStatus: z.enum(['available', 'reserved', 'unavailable']).default('available'),
    availableFrom: z.string().nullable().optional(),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  })
  .refine((v) => (v.lat == null) === (v.lng == null), {
    message: 'admin.validation.invalidCoordinate',
    path: ['lat'],
  });

export type PropertyWritePayload = z.output<typeof propertyWriteSchema>;

/** Place writes never accept a verification flag. Verification is a separate,
 * authenticated editor action so geocoder/manual points cannot self-verify. */
export const placeWriteSchema = z
  .object({
    nameFr: z.string().transform(sanitiseText).refine((v) => v.length >= 2 && v.length <= 160, { message: 'admin.validation.titleRequired' }),
    nameAr: z.string().transform(sanitiseText).refine((v) => v.length >= 2 && v.length <= 160, { message: 'admin.validation.titleRequired' }),
    descriptionFr: z.string().max(6000).transform(sanitiseText).default(''),
    descriptionAr: z.string().max(6000).transform(sanitiseText).default(''),
    addressFr: z.string().max(300).transform(sanitiseText).default(''),
    addressAr: z.string().max(300).transform(sanitiseText).default(''),
    communeSlug: z.string().min(1).max(100, { message: 'admin.validation.communeRequired' }),
    category: z.enum(['landmark','restaurant','cafe','hotel','shopping','service','culture','nature','beach','other']),
    ...coordinatePair,
    coordinatePrecision: z.enum(['exact', 'approximate', 'pending']).default('pending'),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  })
  .refine((v) => (v.lat == null) === (v.lng == null), {
    message: 'admin.validation.invalidCoordinate', path: ['lat'],
  })
  .refine((v) => v.coordinatePrecision !== 'pending' || (v.lat == null && v.lng == null), {
    message: 'admin.validation.invalidCoordinate', path: ['coordinatePrecision'],
  })
  .refine((v) => (v.lat != null && v.lng != null) || v.coordinatePrecision === 'pending', {
    message: 'admin.validation.invalidCoordinate', path: ['coordinatePrecision'],
  });

export type PlaceWritePayload = z.output<typeof placeWriteSchema>;

export const vehicleWriteSchema = z
  .object({
    titleFr: z.string().transform(sanitiseText).refine((v) => v.length >= 3, { message: 'admin.validation.titleRequired' }),
    titleAr: z.string().transform(sanitiseText).refine((v) => v.length >= 3, { message: 'admin.validation.titleRequired' }),
    descriptionFr: z.string().transform(sanitiseText).default(''),
    descriptionAr: z.string().transform(sanitiseText).default(''),
    brand: z.string().min(1).transform(sanitiseText),
    model: z.string().min(1).transform(sanitiseText),
    year: z.number().int().min(1950).max(2100),
    category: z.enum(['economy', 'sedan', 'suv', 'luxury', 'utility', 'van']),
    transmission: z.enum(['manual', 'automatic']),
    fuel: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg']),
    seats: z.number().int().min(1).max(30).default(5),
    doors: z.number().int().min(2).max(6).default(5),
    dealType: z.enum(['rent', 'sale', 'both']),
    dailyPrice: z.number().int().min(0).nullable().optional(),
    salePrice: z.number().int().min(0).nullable().optional(),
    communeSlug: z.string().min(1, { message: 'admin.validation.communeRequired' }),
    ...coordinatePair,
    coordinatePrecision: z.enum(['exact', 'approximate', 'commune', 'pending']).default('pending'),
    mileageKm: z.number().int().min(0).nullable().optional(),
    features: z.array(z.string().transform(sanitiseText)).default([]),
    availabilityStatus: z.enum(['available', 'reserved', 'unavailable']).default('available'),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  })
  .refine((v) => (v.lat == null) === (v.lng == null), {
    message: 'admin.validation.invalidCoordinate',
    path: ['lat'],
  })
  .refine((v) => v.dealType !== 'rent' || v.dailyPrice != null, {
    message: 'admin.validation.priceRequired',
    path: ['dailyPrice'],
  })
  .refine((v) => v.dealType !== 'sale' || v.salePrice != null, {
    message: 'admin.validation.priceRequired',
    path: ['salePrice'],
  })
  .refine((v) => v.dealType !== 'both' || (v.dailyPrice != null && v.salePrice != null), {
    message: 'admin.validation.priceRequired',
    path: ['dailyPrice'],
  });

export type VehicleWritePayload = z.output<typeof vehicleWriteSchema>;

/** Maps a ZodError to `{ fieldPath: messageKey }` for the API envelope. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function validDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const reservationWriteSchema = z
  .object({
    kind: z.enum(['property', 'vehicle']),
    propertyId: z.string().optional(),
    vehicleId: z.string().optional(),
    customerId: z.string().min(1),
    startDate: z.string().refine(validDateOnly, { message: 'form.dateInvalid' }),
    endDate: z.string().refine(validDateOnly, { message: 'form.dateInvalid' }),
    amount: z.number().int().min(0),
    deposit: z.number().int().min(0).default(0),
    status: z.enum(['pending', 'confirmed', 'active', 'completed', 'cancelled']).default('pending'),
    notes: z.string().transform(sanitiseText).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'form.endBeforeStart',
    path: ['endDate'],
  })
  .refine((v) => (v.kind === 'property' ? Boolean(v.propertyId) && !v.vehicleId : Boolean(v.vehicleId) && !v.propertyId), {
    message: 'admin.validation.referenceTaken',
    path: ['propertyId'],
  })
  .refine((v) => v.deposit <= v.amount, {
    message: 'admin.validation.invalidSetting',
    path: ['deposit'],
  });

export const customerWriteSchema = z.object({
  fullName: z.string().min(3).transform(sanitiseText),
  phone: z
    .string()
    .transform((v) => normalisePhone(v))
    .refine((v) => PHONE_RE.test(v), { message: 'form.phoneInvalid' }),
  email: z
    .string()
    .transform(sanitiseText)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), {
      message: 'form.emailInvalid',
    })
    .optional()
    .default(''),
  type: z.enum(['individual', 'company']).default('individual'),
  notes: z.string().transform(sanitiseText).optional().default(''),
  tags: z.array(z.string().transform(sanitiseText)).default([]),
});
