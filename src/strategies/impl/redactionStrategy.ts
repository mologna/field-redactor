import { FunctionalStrategy } from '../functionalStrategy';

export const getRedactionStrategy: () => FunctionalStrategy = () => (value: string) => 'REDACTED';
