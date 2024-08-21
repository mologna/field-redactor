import { redactionStrategies } from "../strategies";

export type REDACTION_STRATEGY = typeof redactionStrategies[number];

export const isRedactionStrategy = (val: any): val is REDACTION_STRATEGY => {
  return redactionStrategies.includes(val); 
}