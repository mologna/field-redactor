import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { DataObfuscator } from '../dataObfuscator';

export abstract class BaseDataObfuscator implements DataObfuscator {
  protected deepCopy = rfdc({ proto: true, circles: true });
  constructor(protected strategy: Strategy) {}

  public obfuscateValues(value: any) {
    throw new Error('Method not implemented.');
  }
}
