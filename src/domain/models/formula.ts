import type { FormulaCategory } from '../../core/constants/categories';
import type { ID } from './common';

export interface FormulaVariable {
  symbol: string;
  meaning: string;
  meaningBn: string;
}

/** Formula library entry (spec §27). */
export interface Formula {
  id: ID;
  category: FormulaCategory;
  name: string;
  nameBn: string;
  expression: string;
  meaning: string;
  meaningBn: string;
  variables: FormulaVariable[];
  example: string;
  exampleBn: string;
  relatedFormulaIds: ID[];
  commonMistakes: string[];
  commonMistakesBn: string[];
  tags: string[];
  contentVersion: number;
}

export interface FormulaFilter {
  categories?: FormulaCategory[];
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
