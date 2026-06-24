import { TraversableJson } from './types';
import { CustomObjectManager } from './customObjectManager';
import { PrimitiveRedactor } from './primitiveRedactor';
import { SecretManager } from './secretManager';
import { ValuePatternMatcher } from './valuePatternMatcher';
import { ObjectRedactorTraversal } from './objectRedactorTraversal';

/**
 * Redacts fields in a JSON object using the secretManager, primitiveRedactor, and CustomObjectChecker provided in the
 * constructor. CustomObjects take highest precedence, followed by fullSecretKeys, then deepSecretKeys, and finally secretKeys.
 */
export class ObjectRedactor {
  private readonly traversal: ObjectRedactorTraversal;

  constructor(
    primitiveRedactor: PrimitiveRedactor,
    secretManager: SecretManager,
    customObjManager: CustomObjectManager,
    valuePatternMatcher: ValuePatternMatcher
  ) {
    this.traversal = new ObjectRedactorTraversal(
      primitiveRedactor,
      secretManager,
      customObjManager,
      valuePatternMatcher
    );
  }

  public async redactInPlace<T extends TraversableJson>(value: T): Promise<T> {
    if (!this.traversal.usesAsyncRedactor()) {
      return Promise.resolve(this.redactInPlaceSync(value));
    }

    return this.traversal.redactInPlaceAsync(value);
  }

  public redactInPlaceSync<T extends TraversableJson>(value: T): T {
    return this.traversal.redactInPlace(value);
  }

  public redactCopyOnWrite<T extends TraversableJson>(value: T): T {
    return this.traversal.redactCopyOnWrite(value);
  }
}
