import { STRATEGIES } from "../strategies";
import { FormatterValues } from "./values";

export class Formatter {
  private static REGEX_VALIDATOR: RegExp = /(\{\{(\w+)\}\})/g;
  private static NO_VALUE_ERROR: string = "{{value}} is required for formatting."

  constructor(private readonly formatString: string, private readonly strategy: STRATEGIES) {
    const formatterError = this.validateFormat(formatString);
    if (formatterError) {
      throw new Error(formatterError);
    }
  }

  public getFormat(): string {
    return this.formatString;
  }

  public format(value: string): string {
    let finalString = this.formatString;
    finalString = finalString.replace('{{value}}', value)
    finalString = finalString.replace('{{strategy}}', this.strategy);
    finalString = finalString.replace('{{shortStrategy}}', this.strategy.split('_')[0]);
    return finalString;
  }

  private validateFormat(format: string): string | undefined {
    let hasValueFormat = false;
    let errorString = '';
    const injects = format.matchAll(Formatter.REGEX_VALIDATOR);
    for (const match of injects) {
      if (!(match[2] in FormatterValues)) {
        if (errorString.length !== 0) {
          errorString += ' ';
        }
        errorString += `${match[1]} is not a valid formatter field.`
      } else if (match[2].localeCompare('value') === 0) {
        hasValueFormat = true;
      }
    }

    if (!hasValueFormat) {
      errorString = Formatter.NO_VALUE_ERROR + ' ' + errorString;
    }

    return errorString.length === 0 ? undefined : errorString;
  }
}