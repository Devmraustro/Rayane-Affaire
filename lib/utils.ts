import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware class name composition. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
