/**
 * The Math Engine. Deterministic, dependency-free and unit-tested; nothing
 * else in the app may compute a mathematical result (spec §61.13/§61.14).
 */
export * as Fractions from './fraction';
export * as NumberTheory from './numberTheory';
export * as Expressions from './expression';
export * as Polynomials from './polynomial';
export * as Equations from './equation';
export * as Geometry from './geometry';
export * as Trigonometry from './trigonometry';
export * as Statistics from './statistics';
export * as Probability from './probability';
export * as Matrices from './matrix';
export * as Calculus from './calculus';
export * as Arithmetic from './arithmetic';

export type { Fraction } from './fraction';
export type { Node } from './expression';
export type { Polynomial } from './polynomial';
export type { EquationSolution, SolveStep } from './equation';
export type { Matrix } from './matrix';
export type { StatsSummary } from './statistics';
export type { SimulationResult, LabExperiment } from './probability';
