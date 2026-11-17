import {
  CustomObject,
  JsonArray,
  JsonLeafValue,
  JsonObject,
  JsonValue,
  RedactablePrimitive,
  SecretSpecifierValue
} from '../types';
import { ContainerMutation } from './objectRedactorMutation';
import { RuleResolver } from '../rules/ruleResolver';
import { SecretManager } from '../rules/secretManager';
import { ValuePatternMatcher } from '../rules/valuePatternMatcher';
import { FieldRedactionScope } from '../rules/redactorBinding';
import { MaybeAsync } from '../util/maybeAsync';

/** Shared capabilities used by array and custom-object redaction modules. */
export type TraversalServices = {
  readonly ruleResolver: RuleResolver;
  readonly secretManager: SecretManager;
  readonly valuePatternMatcher: ValuePatternMatcher;
  setPrimitive(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    primitive: RedactablePrimitive,
    scope: FieldRedactionScope,
    secretKey?: SecretSpecifierValue
  ): MaybeAsync<void>;
  setPrimitiveFromValue(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    value: JsonValue | undefined,
    scope: FieldRedactionScope,
    secretKey?: SecretSpecifierValue
  ): MaybeAsync<void>;
  setPrimitiveValueIfSecret(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    secretKey: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean,
    scope: FieldRedactionScope
  ): MaybeAsync<void>;
  redactSecretFields(
    container: ContainerMutation<JsonObject | JsonArray>,
    forceDeepRedaction: boolean,
    scope: FieldRedactionScope
  ): MaybeAsync<void>;
  handleCustomObject(
    container: ContainerMutation<JsonObject>,
    customObject: CustomObject,
    scope: FieldRedactionScope
  ): MaybeAsync<void>;
  redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    scope: FieldRedactionScope
  ): MaybeAsync<void>;
  redactAllArrayValues(
    array: JsonArray,
    forceDeepRedaction: boolean,
    copyOnWrite: boolean,
    scope: FieldRedactionScope
  ): MaybeAsync<JsonArray>;
};
