import { FormatterValues } from '../values';
import { Formatter } from '../formatter';

export class FormatterImpl implements Formatter {
  private static REGEX_VALIDATOR: RegExp = /(\{\{(\w+)\}\})/g;
  private static NO_VALUE_ERROR: string =
    '{{value}} is required for formatting.';

  constructor(
    private readonly formatString: string,
    private readonly strategy: string
  ) {
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
    finalString = finalString.replace('{{value}}', value);
    finalString = finalString.replace('{{strategy}}', this.strategy);
    return finalString;
  }

  private validateFormat(format: string): string | undefined {
    let hasValueFormat = false;
    let errorString = '';
    const injects = format.matchAll(FormatterImpl.REGEX_VALIDATOR);
    for (const match of injects) {
      if (!(match[2] in FormatterValues)) {
        if (errorString.length !== 0) {
          errorString += ' ';
        }
        errorString += `${match[1]} is not a valid formatter field.`;
      } else if (match[2].localeCompare('value') === 0) {
        hasValueFormat = true;
      }
    }

    if (!hasValueFormat) {
      errorString = FormatterImpl.NO_VALUE_ERROR + ' ' + errorString;
    }

    return errorString.length === 0 ? undefined : errorString;
  }
}
