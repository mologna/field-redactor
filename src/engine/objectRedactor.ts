import { TraversableJson } from '../types';
import { CustomObjectManager } from '../rules/customObjectManager';
import { PrimitiveRedactor } from './primitiveRedactor';
import { SecretManager } from '../rules/secretManager';
import { ValuePatternMatcher } from '../rules/valuePatternMatcher';
import { PathRuleMatcher } from '../rules/pathRuleMatcher';
import { ObjectRedactorTraversal } from './objectRedactorTraversal';

/**
 * Redacts fields in a JSON object using the secretManager, primitiveRedactor, and CustomObjectManager provided in the
 * constructor. CustomObjects take highest precedence, followed by opaque (`opaqueSecretKeys`), then deep, then shallow.
 */
export class ObjectRedactor {
  private readonly traversal: ObjectRedactorTraversal;

  constructor(
    primitiveRedactor: PrimitiveRedactor,
    secretManager: SecretManager,
    customObjManager: CustomObjectManager,
    valuePatternMatcher: ValuePatternMatcher,
    pathRuleMatcher: PathRuleMatcher
  ) {
    this.traversal = new ObjectRedactorTraversal(
      primitiveRedactor,
      secretManager,
      customObjManager,
      valuePatternMatcher,
      pathRuleMatcher
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
