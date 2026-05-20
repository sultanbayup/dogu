import { ComponentType } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Slug pattern: 1–64 characters, lowercase a–z, digits 0–9, and hyphens only.
 * No leading or trailing hyphens.
 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/**
 * Tool categories enumeration.
 */
export type ToolCategory =
  | 'random'      // Team Splitter, Spin Wheel, Random Picker
  | 'calculator'  // Split Bill
  | 'generator'   // QR Generator
  | 'converter'
  | 'utility';

/**
 * Metadata describing a single tool in the registry.
 */
export interface ToolMetadata {
  slug: string;                                  // matches SLUG_PATTERN, 1–64 chars
  name: string;                                  // 1–60 chars, display name
  description: string;                           // 1–160 chars, short description
  category: ToolCategory;
  icon: LucideIcon;                              // icon reference
  popular: boolean;
  component: () => Promise<{ default: ComponentType }>;  // lazy component reference
}

/**
 * Validates a registry array for correctness.
 * Throws a descriptive error if any entry is invalid or any slug is duplicated.
 *
 * Checks:
 * - No duplicate slugs (names both entries in error)
 * - Valid slug format (matches SLUG_PATTERN)
 * - No missing or empty required fields
 * - Name ≤ 60 characters
 * - Description ≤ 160 characters
 */
export function validateRegistry(entries: ToolMetadata[]): void {
  const slugs = new Map<string, ToolMetadata>();

  for (const entry of entries) {
    // Check for duplicate slugs
    if (slugs.has(entry.slug)) {
      const existing = slugs.get(entry.slug)!;
      throw new Error(
        `Duplicate slug "${entry.slug}" in Tool Registry. ` +
        `Entries: "${existing.name}" and "${entry.name}".`
      );
    }
    slugs.set(entry.slug, entry);

    // Check required fields are present and non-empty
    if (!entry.slug || typeof entry.slug !== 'string') {
      throw new Error(
        `Tool Registry entry missing or empty required field "slug".`
      );
    }

    // Check slug format
    if (!SLUG_PATTERN.test(entry.slug)) {
      throw new Error(
        `Invalid slug format in Tool Registry entry "${entry.name}": "${entry.slug}". ` +
        `Slug must match pattern: ^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`
      );
    }

    if (!entry.name || typeof entry.name !== 'string') {
      throw new Error(
        `Tool Registry entry with slug "${entry.slug}" missing or empty required field "name".`
      );
    }

    if (!entry.description || typeof entry.description !== 'string') {
      throw new Error(
        `Tool Registry entry "${entry.name}" missing or empty required field "description".`
      );
    }

    if (!entry.category || typeof entry.category !== 'string') {
      throw new Error(
        `Tool Registry entry "${entry.name}" missing or empty required field "category".`
      );
    }

    if (!entry.icon || (typeof entry.icon !== 'function' && typeof entry.icon !== 'object')) {
      throw new Error(
        `Tool Registry entry "${entry.name}" missing or empty required field "icon".`
      );
    }

    if (typeof entry.popular !== 'boolean') {
      throw new Error(
        `Tool Registry entry "${entry.name}" missing or invalid required field "popular".`
      );
    }

    if (!entry.component || typeof entry.component !== 'function') {
      throw new Error(
        `Tool Registry entry "${entry.name}" missing or empty required field "component".`
      );
    }

    // Check name length
    if (entry.name.length > 60) {
      throw new Error(
        `Tool Registry entry "${entry.name}" has name exceeding 60 characters (${entry.name.length} chars).`
      );
    }

    // Check description length
    if (entry.description.length > 160) {
      throw new Error(
        `Tool Registry entry "${entry.name}" has description exceeding 160 characters (${entry.description.length} chars).`
      );
    }
  }
}

/**
 * Pure lookup function. Returns the tool metadata for a given slug,
 * or undefined if the slug is not found.
 */
export function findTool(slug: string): ToolMetadata | undefined {
  return tools.find(tool => tool.slug === slug);
}

/**
 * The tool registry: a read-only array of all registered tools,
 * sorted lexicographically by slug.
 * Validation runs at module load.
 */
export const tools: ReadonlyArray<ToolMetadata> = [];

// Validate the registry at module load
validateRegistry(tools as ToolMetadata[]);
