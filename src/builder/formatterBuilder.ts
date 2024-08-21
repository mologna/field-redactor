import { FormatterImpl } from "../formatter/impl/formatterImpl";

export class FormatterBuilder {
  public static DEFAULT_FORMAT: string = "{{strategy}}[{{value}}]";
  private formatString: string = FormatterBuilder.DEFAULT_FORMAT;
  private formatStrategy?: string;

  public setFormatString(formatString: string): FormatterBuilder {
    this.formatString = formatString;
    return this;
  }

  public setFormatStrategy(formatStrategy: string): FormatterBuilder {
    this.formatStrategy = formatStrategy;
    return this;
  }

  public build() {
    if (!this.formatStrategy) {
      throw new Error("Must specify format strategy before building.");
    }

    return new FormatterImpl(this.formatString, this.formatStrategy);
  }
}