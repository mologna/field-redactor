import {
  CustomObject,
  JsonArray,
  JsonLeafValue,
  JsonObject,
  JsonValue,
  RedactablePrimitive,
  SecretSpecifierValue
} from './types';
import { ContainerMutation } from './objectRedactorMutation';
import { RuleResolver } from './ruleResolver';
import { SecretManager } from './secretManager';
import { ValuePatternMatcher } from './valuePatternMatcher';
import { MaybeAsync } from './maybeAsync';

/** Shared capabilities used by array and custom-object redaction modules. */
export type TraversalServices = {
  readonly asyncMode: boolean;
  readonly ruleResolver: RuleResolver;
  readonly secretManager: SecretManager;
  readonly valuePatternMatcher: ValuePatternMatcher;
  setPrimitive(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    primitive: RedactablePrimitive
  ): MaybeAsync<void>;
  setPrimitiveFromValue(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    value: JsonValue | undefined
  ): MaybeAsync<void>;
  setPrimitiveValueIfSecret(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    secretKey: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean
  ): MaybeAsync<void>;
  redactSecretFields(
    container: ContainerMutation<JsonObject | JsonArray>,
    forceDeepRedaction: boolean,
    pathSegments: Array<string | number>
  ): MaybeAsync<void>;
  handleCustomObject(container: ContainerMutation<JsonObject>, customObject: CustomObject): MaybeAsync<void>;
  redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    pathSegments: Array<string | number>
  ): MaybeAsync<void>;
  redactAllArrayValues(
    array: JsonArray,
    forceDeepRedaction: boolean,
    copyOnWrite: boolean,
    pathSegments: Array<string | number>
  ): MaybeAsync<JsonArray>;
};
