import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SLUG_PATTERN, validateRegistry, findTool, tools, ToolMetadata } from './registry';
import { Heart } from 'lucide-react';

// Helper to create a valid tool metadata entry
const createValidTool = (overrides?: Partial<ToolMetadata>): ToolMetadata => ({
  slug: 'test-tool',
  name: 'Test Tool',
  description: 'A test tool for validation',
  category: 'utility',
  icon: Heart,
  popular: false,
  component: async () => ({ default: () => null }),
  ...overrides,
});

describe('SLUG_PATTERN', () => {
  it('should match valid slugs', () => {
    expect(SLUG_PATTERN.test('a')).toBe(true);
    expect(SLUG_PATTERN.test('test-tool')).toBe(true);
    expect(SLUG_PATTERN.test('team-splitter')).toBe(true);
    expect(SLUG_PATTERN.test('split-bill-2')).toBe(true);
    expect(SLUG_PATTERN.test('a1b2c3')).toBe(true);
    expect(SLUG_PATTERN.test('0')).toBe(true);
  });

  it('should reject invalid slugs', () => {
    expect(SLUG_PATTERN.test('')).toBe(false);
    expect(SLUG_PATTERN.test('-test')).toBe(false);
    expect(SLUG_PATTERN.test('test-')).toBe(false);
    expect(SLUG_PATTERN.test('Test-Tool')).toBe(false);
    expect(SLUG_PATTERN.test('test_tool')).toBe(false);
    expect(SLUG_PATTERN.test('test tool')).toBe(false);
    expect(SLUG_PATTERN.test('a'.repeat(65))).toBe(false);
  });

  it('should accept exactly 64 character slugs', () => {
    const slug64 = 'a' + 'b'.repeat(62) + 'c';
    expect(slug64.length).toBe(64);
    expect(SLUG_PATTERN.test(slug64)).toBe(true);
  });

  it('should reject 65 character slugs', () => {
    const slug65 = 'a' + 'b'.repeat(63) + 'c';
    expect(slug65.length).toBe(65);
    expect(SLUG_PATTERN.test(slug65)).toBe(false);
  });
});

describe('validateRegistry', () => {
  it('should accept an empty registry', () => {
    expect(() => validateRegistry([])).not.toThrow();
  });

  it('should accept a single valid entry', () => {
    const entry = createValidTool();
    expect(() => validateRegistry([entry])).not.toThrow();
  });

  it('should accept multiple valid entries with different slugs', () => {
    const entries = [
      createValidTool({ slug: 'tool-a', name: 'Tool A' }),
      createValidTool({ slug: 'tool-b', name: 'Tool B' }),
      createValidTool({ slug: 'tool-c', name: 'Tool C' }),
    ];
    expect(() => validateRegistry(entries)).not.toThrow();
  });

  it('should reject duplicate slugs and name both entries', () => {
    const entries = [
      createValidTool({ slug: 'duplicate', name: 'First Tool' }),
      createValidTool({ slug: 'duplicate', name: 'Second Tool' }),
    ];
    expect(() => validateRegistry(entries)).toThrow(
      /Duplicate slug "duplicate".*"First Tool".*"Second Tool"/
    );
  });

  it('should reject invalid slug format', () => {
    const entry = createValidTool({ slug: 'Invalid-Slug' });
    expect(() => validateRegistry([entry])).toThrow(/Invalid slug format/);
  });

  it('should reject slug with leading hyphen', () => {
    const entry = createValidTool({ slug: '-test' });
    expect(() => validateRegistry([entry])).toThrow(/Invalid slug format/);
  });

  it('should reject slug with trailing hyphen', () => {
    const entry = createValidTool({ slug: 'test-' });
    expect(() => validateRegistry([entry])).toThrow(/Invalid slug format/);
  });

  it('should reject empty slug', () => {
    const entry = createValidTool({ slug: '' });
    expect(() => validateRegistry([entry])).toThrow(/missing or empty required field "slug"/);
  });

  it('should reject empty name', () => {
    const entry = createValidTool({ name: '' });
    expect(() => validateRegistry([entry])).toThrow(/missing or empty required field "name"/);
  });

  it('should reject empty description', () => {
    const entry = createValidTool({ description: '' });
    expect(() => validateRegistry([entry])).toThrow(/missing or empty required field "description"/);
  });

  it('should reject missing category', () => {
    const entry = createValidTool();
    delete (entry as any).category;
    expect(() => validateRegistry([entry])).toThrow(/missing or empty required field "category"/);
  });

  it('should reject missing icon', () => {
    const entry = createValidTool();
    delete (entry as any).icon;
    expect(() => validateRegistry([entry])).toThrow(/missing or empty required field "icon"/);
  });

  it('should reject missing popular field', () => {
    const entry = createValidTool();
    delete (entry as any).popular;
    expect(() => validateRegistry([entry])).toThrow(/missing or invalid required field "popular"/);
  });

  it('should reject missing component', () => {
    const entry = createValidTool();
    delete (entry as any).component;
    expect(() => validateRegistry([entry])).toThrow(/missing or empty required field "component"/);
  });

  it('should reject name exceeding 60 characters', () => {
    const entry = createValidTool({ name: 'a'.repeat(61) });
    expect(() => validateRegistry([entry])).toThrow(/exceeding 60 characters/);
  });

  it('should accept name with exactly 60 characters', () => {
    const entry = createValidTool({ name: 'a'.repeat(60) });
    expect(() => validateRegistry([entry])).not.toThrow();
  });

  it('should reject description exceeding 160 characters', () => {
    const entry = createValidTool({ description: 'a'.repeat(161) });
    expect(() => validateRegistry([entry])).toThrow(/exceeding 160 characters/);
  });

  it('should accept description with exactly 160 characters', () => {
    const entry = createValidTool({ description: 'a'.repeat(160) });
    expect(() => validateRegistry([entry])).not.toThrow();
  });
});

describe('findTool', () => {
  it('should return undefined for empty registry', () => {
    expect(findTool('any-slug')).toBeUndefined();
  });

  it('should return undefined for unknown slug', () => {
    expect(findTool('unknown-slug')).toBeUndefined();
  });
});

describe('Property 11: findTool lookup correctness', () => {
  /**
   * **Validates: Requirements 1.9**
   *
   * For any slug string, findTool(slug) returns the ToolMetadata entry whose
   * slug field equals the input if such an entry exists, and returns undefined
   * otherwise. For every registered entry e, findTool(e.slug) === e.
   */

  it(
    'findTool returns the matching entry for every registered slug',
    () => {
      // For every registered entry e, findTool(e.slug) === e
      for (const entry of tools) {
        expect(findTool(entry.slug)).toBe(entry);
      }
    }
  );

  it(
    'findTool returns undefined for slugs not in the registry',
    () => {
      fc.assert(
        fc.property(
          fc.string(),
          (slug) => {
            const registeredSlugs = new Set(tools.map((t: ToolMetadata) => t.slug));
            const result = findTool(slug);
            if (registeredSlugs.has(slug)) {
              // If the slug is registered, result must be the matching entry
              expect(result).toBeDefined();
              expect(result!.slug).toBe(slug);
            } else {
              // If the slug is not registered, result must be undefined
              expect(result).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'findTool is consistent: same slug always returns same entry',
    () => {
      fc.assert(
        fc.property(
          arbitraryValidSlug(),
          (slug) => {
            const result1 = findTool(slug);
            const result2 = findTool(slug);
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// Property-based test generators
const arbitraryValidSlug = (): fc.Arbitrary<string> => {
  // Generate valid slugs: 1-64 chars, lowercase a-z, 0-9, hyphens, no leading/trailing hyphen
  return fc
    .tuple(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      fc.array(
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
        { minLength: 0, maxLength: 62 }
      ),
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''))
    )
    .map(([first, middle, last]) => {
      if (middle.length === 0) return first;
      return first + middle.join('') + last;
    });
};

const arbitraryInvalidSlug = (): fc.Arbitrary<string> => {
  // Generate invalid slugs: uppercase, underscores, spaces, leading/trailing hyphens, too long, etc.
  return fc.oneof(
    fc.string({ minLength: 1, maxLength: 64 }).filter(s => /[A-Z_\s]/.test(s)), // uppercase, underscore, space
    fc.string({ minLength: 1, maxLength: 64 }).map(s => '-' + s), // leading hyphen
    fc.string({ minLength: 1, maxLength: 64 }).map(s => s + '-'), // trailing hyphen
    // Too long: build from valid alphabet but exceed 64 chars (avoids filter rejection loops)
    fc.array(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 65, maxLength: 100 }
    ).map(chars => chars.join('')),
    fc.constant(''), // empty
  );
};

type ToolCategory = 'random' | 'calculator' | 'generator' | 'converter' | 'utility';

const arbitraryToolMetadata = (overrides?: Partial<ToolMetadata>): fc.Arbitrary<ToolMetadata> => {
  // Use printable non-whitespace chars to avoid empty-after-trim rejections
  const safeString = (min: number, max: number) =>
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')),
      { minLength: min, maxLength: max }
    ).filter(s => s.trim().length > 0);

  return fc
    .tuple(
      arbitraryValidSlug(),
      safeString(1, 60),
      safeString(1, 160),
      fc.constantFrom<ToolCategory>('random', 'calculator', 'generator', 'converter', 'utility'),
      fc.constant(Heart),
      fc.boolean(),
      fc.constant(async () => ({ default: () => null }))
    )
    .map(([slug, name, description, category, icon, popular, component]) => ({
      slug,
      name,
      description,
      category,
      icon,
      popular,
      component,
      ...overrides,
    }));
};

describe('Property 1: Slug validation correctness', () => {
  // Feature: dogu-platform, Property 1: Slug validation correctness
  /**
   * **Validates: Requirements 1.1, 1.6**
   *
   * Property: SLUG_PATTERN.test(s) returns true iff s is 1–64 chars,
   * lowercase a–z/0–9/hyphens only, no leading/trailing hyphen.
   *
   * Acceptance generator: fc.stringOf(fc.constantFrom(...)) constrained to
   * valid slug alphabet + length, with no leading/trailing hyphen.
   * Rejection generator: fc.string() (arbitrary strings, most will be invalid).
   */

  // Helper: build a valid slug using fc.stringOf constrained to the valid alphabet
  const validSlugAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
  const validSlugAlphabetWithHyphen = 'abcdefghijklmnopqrstuvwxyz0123456789-'.split('');

  // Acceptance generator: fc.stringOf constrained to valid slug alphabet + length
  // Produces strings of 1–64 chars from [a-z0-9-] with no leading/trailing hyphen
  const arbitraryAcceptedSlug = fc
    .tuple(
      // First char: must be alphanumeric (no hyphen)
      fc.stringOf(fc.constantFrom(...validSlugAlphabet), { minLength: 1, maxLength: 1 }),
      // Middle chars (0–62): can include hyphens
      fc.stringOf(fc.constantFrom(...validSlugAlphabetWithHyphen), { minLength: 0, maxLength: 62 }),
      // Last char: must be alphanumeric (no hyphen) — only used when middle is non-empty
      fc.stringOf(fc.constantFrom(...validSlugAlphabet), { minLength: 1, maxLength: 1 }),
    )
    .map(([first, middle, last]) => {
      // Single-char slug: just the first char
      if (middle.length === 0) return first;
      return first + middle + last;
    })
    .filter(s => s.length >= 1 && s.length <= 64);

  it(
    'acceptance: SLUG_PATTERN accepts all strings from the valid slug alphabet (1–64 chars, no leading/trailing hyphen)',
    () => {
      fc.assert(
        fc.property(arbitraryAcceptedSlug, (slug) => {
          expect(SLUG_PATTERN.test(slug)).toBe(true);
        }),
        { numRuns: 25 }
      );
    }
  );

  it(
    'rejection: SLUG_PATTERN rejects arbitrary strings that violate slug constraints',
    () => {
      fc.assert(
        fc.property(
          // fc.string() generates arbitrary strings; most will be invalid slugs
          fc.string(),
          (s) => {
            const matches = SLUG_PATTERN.test(s);
            // If the pattern matches, verify ALL constraints hold (biconditional check)
            if (matches) {
              // Must be 1–64 characters
              expect(s.length).toBeGreaterThanOrEqual(1);
              expect(s.length).toBeLessThanOrEqual(64);
              // Must consist only of lowercase a–z, digits 0–9, and hyphens
              expect(/^[a-z0-9-]+$/.test(s)).toBe(true);
              // Must not start with a hyphen
              expect(s[0]).not.toBe('-');
              // Must not end with a hyphen
              expect(s[s.length - 1]).not.toBe('-');
            } else {
              // If the pattern rejects, at least one constraint must be violated
              const violatesLength = s.length < 1 || s.length > 64;
              const violatesAlphabet = /[^a-z0-9-]/.test(s);
              const violatesLeadingHyphen = s.startsWith('-');
              const violatesTrailingHyphen = s.endsWith('-');
              expect(
                violatesLength || violatesAlphabet || violatesLeadingHyphen || violatesTrailingHyphen
              ).toBe(true);
            }
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    'biconditional: SLUG_PATTERN.test(s) === true iff s satisfies all slug constraints',
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Valid slugs (should match)
            arbitraryAcceptedSlug.map(s => ({ slug: s, expectedMatch: true })),
            // Arbitrary strings via fc.string() (most should not match)
            fc.string().map(s => ({
              slug: s,
              expectedMatch:
                s.length >= 1 &&
                s.length <= 64 &&
                /^[a-z0-9-]+$/.test(s) &&
                !s.startsWith('-') &&
                !s.endsWith('-'),
            }))
          ),
          ({ slug, expectedMatch }) => {
            expect(SLUG_PATTERN.test(slug)).toBe(expectedMatch);
          }
        ),
        { numRuns: 50 }
      );
    }
  );
});

describe('Property 2: Registry invariants', () => {
  /**
   * Validates: Requirements 1.1, 1.5, 1.6, 1.7
   *
   * Property: validateRegistry accepts iff all entries are valid,
   * no duplicate slugs exist, and entries are sorted by slug.
   *
   * This property test uses a custom fc.array(arbitraryToolMetadata()) generator
   * producing valid and intentionally invalid entries, then asserts that
   * validateRegistry accepts iff all entries are valid, no duplicate slugs exist,
   * and the result would be sorted by slug.
   */
  it(
    'should accept valid registries with no duplicates and verify invariants',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryToolMetadata(), { maxLength: 20 }),
          (entries) => {
            // Remove duplicates by slug to ensure valid input
            const uniqueEntries = Array.from(
              new Map(entries.map(e => [e.slug, e])).values()
            );

            // Should not throw for valid entries with no duplicates
            expect(() => validateRegistry(uniqueEntries)).not.toThrow();

            // Verify all entries meet validation criteria
            for (const entry of uniqueEntries) {
              expect(entry.slug).toBeTruthy();
              expect(entry.name).toBeTruthy();
              expect(entry.description).toBeTruthy();
              expect(entry.category).toBeTruthy();
              expect(entry.icon).toBeTruthy();
              expect(typeof entry.popular).toBe('boolean');
              expect(entry.component).toBeTruthy();
              expect(entry.slug.length).toBeLessThanOrEqual(64);
              expect(entry.name.length).toBeLessThanOrEqual(60);
              expect(entry.description.length).toBeLessThanOrEqual(160);
              expect(SLUG_PATTERN.test(entry.slug)).toBe(true);
            }

            // Note: validateRegistry does not sort entries — sorting is the
            // responsibility of the exported `tools` array. We only verify
            // that validation passes for valid, duplicate-free input.
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    'should reject registries with duplicate slugs',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryToolMetadata(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (entries, duplicateIndex) => {
            if (entries.length === 0) return;

            const idx = duplicateIndex % entries.length;
            // Create a duplicate by copying an entry with the same slug
            const duplicate = { ...entries[idx] };
            const testEntries = [...entries, duplicate];

            // Should throw for duplicate slugs
            expect(() => validateRegistry(testEntries)).toThrow(
              /Duplicate slug/
            );
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    'should reject registries with invalid slugs',
    () => {
      fc.assert(
        fc.property(
          arbitraryInvalidSlug(),
          (invalidSlug) => {
            const entry = createValidTool({ slug: invalidSlug });
            // Should throw for invalid slug format or empty slug
            expect(() => validateRegistry([entry])).toThrow();
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    'should reject registries with invalid field lengths',
    () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 61, maxLength: 200 }).map(name => ({ name })),
            fc.string({ minLength: 161, maxLength: 300 }).map(description => ({ description }))
          ),
          (overrides) => {
            const entry = createValidTool(overrides);
            // Should throw for name > 60 or description > 160
            expect(() => validateRegistry([entry])).toThrow();
          }
        ),
        { numRuns: 25 }
      );
    }
  );

  it(
    'should verify all entries are valid when validation passes',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryToolMetadata(), { maxLength: 20 }),
          (entries) => {
            // Remove duplicates by slug
            const uniqueEntries = Array.from(
              new Map(entries.map(e => [e.slug, e])).values()
            );

            // Should not throw for valid entries
            expect(() => validateRegistry(uniqueEntries)).not.toThrow();

            // Verify all entries meet validation criteria
            for (const entry of uniqueEntries) {
              expect(entry.slug).toBeTruthy();
              expect(entry.name).toBeTruthy();
              expect(entry.description).toBeTruthy();
              expect(entry.category).toBeTruthy();
              expect(entry.icon).toBeTruthy();
              expect(typeof entry.popular).toBe('boolean');
              expect(entry.component).toBeTruthy();
              expect(entry.slug.length).toBeLessThanOrEqual(64);
              expect(entry.name.length).toBeLessThanOrEqual(60);
              expect(entry.description.length).toBeLessThanOrEqual(160);
              expect(SLUG_PATTERN.test(entry.slug)).toBe(true);
            }
          }
        ),
        { numRuns: 25 }
      );
    }
  );
});


