import { FieldRedactorConfigurationError } from '../errors';
import { RedactorInput, SyncRedactor } from '../types';

const textOf = (value: RedactorInput): string => (value == null ? '' : String(value));

const assertMaskOptions = (count: number, maskChar: string): void => {
  if (!Number.isInteger(count) || count < 0) {
    throw new FieldRedactorConfigurationError('Mask length must be a non-negative integer.');
  }

  if (maskChar.length !== 1) {
    throw new FieldRedactorConfigurationError('Mask character must be a single character.');
  }
};

/**
 * Mask every character except the last `count`.
 * Values shorter than or equal to `count` are masked entirely, so a 4-digit string is not revealed by keep-4.
 */
export const maskKeepLast = (count: number, maskChar = '*'): SyncRedactor => {
  assertMaskOptions(count, maskChar);

  return (value) => {
    const text = textOf(value);
    if (text.length <= count) {
      return maskChar.repeat(text.length);
    }

    return maskChar.repeat(text.length - count) + text.slice(text.length - count);
  };
};

const digitIndexes = (text: string): number[] => {
  const indexes: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char >= '0' && char <= '9') {
      indexes.push(index);
    }
  }

  return indexes;
};

/**
 * Mask every digit except the last `count`, leaving separators in place.
 * `4111-1111-1111-4242` with count 4 becomes `****-****-****-4242`.
 * `count` or fewer digits, including `count` 0, masks every digit.
 */
export const maskKeepLastDigits = (count: number, maskChar = '*'): SyncRedactor => {
  assertMaskOptions(count, maskChar);

  return (value) => {
    const text = textOf(value);
    const digits = digitIndexes(text);
    if (count === 0 || digits.length <= count) {
      return text.replace(/\d/g, maskChar);
    }

    const keep = new Set(digits.slice(digits.length - count));
    let masked = '';
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      const isDigit = char >= '0' && char <= '9';
      masked += isDigit && !keep.has(index) ? maskChar : char;
    }

    return masked;
  };
};
