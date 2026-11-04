import { describe, expect, it } from 'vitest';
import {
  inquirySchema,
  normalisePhone,
  sanitiseText,
  propertyWriteSchema,
  vehicleWriteSchema,
  fieldErrors,
  loginSchema,
} from '@/lib/validation';

describe('phone normalisation', () => {
  it('accepts local Algerian formats', () => {
    expect(normalisePhone('0550 12 34 56')).toBe('0550123456');
    expect(normalisePhone('0550-12-34-56')).toBe('0550123456');
    expect(normalisePhone('(0550) 123456')).toBe('0550123456');
  });

  it('accepts and canonicalises international formats', () => {
    expect(normalisePhone('+213 550 12 34 56')).toBe('0550123456');
    expect(normalisePhone('002135501234 56')).toBe('0550123456');
    expect(normalisePhone('213550123456')).toBe('0550123456');
  });
});

describe('text sanitisation', () => {
  it('strips control characters but keeps accents and Arabic', () => {
    expect(sanitiseText('Béjaïa\u0000\u0007 centre')).toBe('Béjaïa centre');
    expect(sanitiseText('  شقة مفروشة  ')).toBe('شقة مفروشة');
  });

  it('normalises CRLF line endings', () => {
    expect(sanitiseText('line1\r\nline2')).toBe('line1\nline2');
  });
});

describe('inquirySchema', () => {
  const valid = {
    fullName: 'Amine Boudiaf',
    phone: '0550 12 34 56',
    email: 'amine@example.dz',
    message: 'Je cherche un appartement F3 à Béjaïa pour 45 000 DA par mois.',
    consent: true,
    preferredChannel: 'whatsapp',
    locale: 'fr',
    type: 'property',
  };

  it('accepts a well-formed inquiry', () => {
    const result = inquirySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('0550123456');
      expect(result.data.email).toBe('amine@example.dz');
    }
  });

  it('rejects a short name, bad phone, short message and missing consent', () => {
    const result = inquirySchema.safeParse({
      ...valid,
      fullName: 'Al',
      phone: 'abc',
      message: 'court',
      consent: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.fullName).toBe('form.nameTooShort');
      expect(errors.phone).toBe('form.phoneInvalid');
      expect(errors.message).toBe('form.messageTooShort');
      expect(errors.consent).toBe('form.consentRequired');
    }
  });

  it('rejects an over-long message', () => {
    const result = inquirySchema.safeParse({ ...valid, message: 'a'.repeat(2100) });
    expect(result.success).toBe(false);
  });

  it('allows an empty e-mail but rejects a malformed one', () => {
    expect(inquirySchema.safeParse({ ...valid, email: '' }).success).toBe(true);
    expect(inquirySchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a honeypot value that is too long', () => {
    expect(inquirySchema.safeParse({ ...valid, website: 'spam' }).success).toBe(false);
  });

  it('rejects an unknown locale', () => {
    expect(inquirySchema.safeParse({ ...valid, locale: 'en' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('normalises the e-mail case', () => {
    const result = loginSchema.safeParse({ email: 'Owner@Rayane.DZ', password: 'x' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('owner@rayane.dz');
  });
});

describe('propertyWriteSchema', () => {
  const base = {
    titleFr: 'Appartement F3',
    titleAr: 'شقة F3',
    category: 'apartment',
    transaction: 'rent_annual',
    price: 45000,
    priceUnit: 'month',
    communeSlug: 'bejaia',
  };

  it('accepts a minimal valid property', () => {
    expect(propertyWriteSchema.safeParse(base).success).toBe(true);
  });

  it('requires both language titles', () => {
    const result = propertyWriteSchema.safeParse({ ...base, titleAr: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error).titleAr).toBe('admin.validation.titleRequired');
    }
  });

  it('rejects a coordinate pair that is only half supplied', () => {
    const result = propertyWriteSchema.safeParse({ ...base, lat: 36.75 });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range coordinates', () => {
    expect(propertyWriteSchema.safeParse({ ...base, lat: 120, lng: 5 }).success).toBe(false);
    expect(propertyWriteSchema.safeParse({ ...base, lat: 36, lng: 400 }).success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(propertyWriteSchema.safeParse({ ...base, price: -1 }).success).toBe(false);
  });
});

describe('vehicleWriteSchema', () => {
  const base = {
    titleFr: 'Renault Clio',
    titleAr: 'رونو كليو',
    brand: 'Renault',
    model: 'Clio',
    year: 2023,
    category: 'economy',
    transmission: 'manual',
    fuel: 'petrol',
    dealType: 'rent',
    dailyPrice: 4500,
    communeSlug: 'bejaia',
  };

  it('accepts a valid rental vehicle', () => {
    expect(vehicleWriteSchema.safeParse(base).success).toBe(true);
  });

  it('requires a daily price when the vehicle is rentable', () => {
    const result = vehicleWriteSchema.safeParse({ ...base, dailyPrice: null });
    expect(result.success).toBe(false);
  });

  it('requires both prices when the vehicle is rentable and for sale', () => {
    expect(vehicleWriteSchema.safeParse({ ...base, dealType: 'both', salePrice: null }).success).toBe(
      false,
    );
    expect(
      vehicleWriteSchema.safeParse({ ...base, dealType: 'both', salePrice: 3000000 }).success,
    ).toBe(true);
  });

  it('rejects an implausible year', () => {
    expect(vehicleWriteSchema.safeParse({ ...base, year: 1800 }).success).toBe(false);
  });
});
