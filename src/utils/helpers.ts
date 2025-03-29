import crypto from 'crypto';

export const generateRandomString = (length: number): string => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

export const calculateSessionDuration = (startTime: Date, endTime: Date | null): number => {
  const end = endTime || new Date();
  return Math.floor((end.getTime() - startTime.getTime()) / (1000 * 60)); // Duration in minutes
};

export const formatDate = (date: Date): string => {
  return date.toISOString().replace('T', ' ').substr(0, 19);
};

export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
};

export const parseBoolean = (value: string | undefined): boolean => {
  return value?.toLowerCase() === 'true';
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
