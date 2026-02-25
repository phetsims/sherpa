// Copyright 2026, University of Colorado Boulder

/**
 * Type declarations for lit-html (lit-core.min.js).
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

type TemplateResult = {
  readonly _$litType$: number;
  readonly strings: TemplateStringsArray;
  readonly values: readonly unknown[];
};
export function html( strings: TemplateStringsArray, ...values: unknown[] ): TemplateResult;
export function render( value: TemplateResult | null, container: HTMLElement | DocumentFragment ): void;
export const nothing: symbol;
export type { TemplateResult };
