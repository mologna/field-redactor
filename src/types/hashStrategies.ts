import { hashStrategies } from "../strategies";

export type HASH_STRATEGIES = typeof hashStrategies[number];

export const isHashStrategy = (val: any): val is HASH_STRATEGIES => {
  return hashStrategies.includes(val);
}