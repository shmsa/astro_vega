/**
 * Fixed Stars Module — Catalog
 * Carrega e indexa corpus/fixed-stars-vega-v1.json
 */

import type { FixedStarCatalogEntry } from './types';
import catalogData from './data/fixed-stars-vega-v1.json';

const RAW_CATALOG: FixedStarCatalogEntry[] = catalogData as FixedStarCatalogEntry[];

/** Mapa indexado por id para lookup O(1) */
const INDEX_BY_ID = new Map<string, FixedStarCatalogEntry>(
  RAW_CATALOG.map((s) => [s.id, s])
);

/** Mapa indexado por constelação */
const INDEX_BY_CONSTELLATION = new Map<string, FixedStarCatalogEntry[]>();
for (const star of RAW_CATALOG) {
  const list = INDEX_BY_CONSTELLATION.get(star.constellation) ?? [];
  list.push(star);
  INDEX_BY_CONSTELLATION.set(star.constellation, list);
}

/** Retorna todas as estrelas do catálogo */
export function getAllStars(): FixedStarCatalogEntry[] {
  return RAW_CATALOG;
}

/** Retorna uma estrela pelo id */
export function getStarById(id: string): FixedStarCatalogEntry | undefined {
  return INDEX_BY_ID.get(id);
}

/** Retorna todas as estrelas de uma constelação */
export function getStarsByConstellation(constellation: string): FixedStarCatalogEntry[] {
  return INDEX_BY_CONSTELLATION.get(constellation) ?? [];
}

/** Lista de constelações únicas presentes no catálogo */
export function getAllConstellations(): string[] {
  return Array.from(INDEX_BY_CONSTELLATION.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Quantidade total de estrelas no catálogo */
export const CATALOG_SIZE = RAW_CATALOG.length;
