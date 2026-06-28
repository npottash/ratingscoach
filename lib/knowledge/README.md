## Proprietary knowledge overlay

This directory holds the proprietary content that gives The Ratings Coach its edge — real questions, common pitfalls, strong-answer markers, and agency intel, organized by **sector × factor × agency**.

### Folder layout

```
lib/knowledge/
  <sector>/
    <factor>/
      sp.json
      moodys.json
      fitch.json
```

Sectors and factors use snake_case slugs. Mapping is in `lib/knowledge/index.ts`.

### Cell schema

Each JSON file has four arrays. Each item in an array can be a **plain string** (universal — applies to all sub-types of the sector) or an **object with `text` + `sub_types`** (applies only when the session's sub-type matches one in the list). Mix freely within the same array.

```json
{
  "real_questions": [
    "A universal question — fires for every sub-type of this sector.",
    {
      "text": "A sub-type-specific question.",
      "sub_types": ["Online / Digital Bank / Neobank / Fintech Bank"]
    }
  ],
  "common_pitfalls": [
    "Universal pitfall.",
    {
      "text": "Pitfall that only applies to a specific sub-type.",
      "sub_types": ["Community Bank"]
    }
  ],
  "strong_answer_markers": [],
  "agency_intel": []
}
```

The `sub_types` values must match the sub-type strings used in the intake form (see `SUB_TYPES_BY_SECTOR` in `app/intake/page.tsx`).

### How to add content

You do not need to edit JSON yourself. Drop unstructured notes into a chat (a paragraph per factor is fine) and they will be structured into the right cell. Keep it in your voice; the schema is just for the model.

### How it flows into the product

- The **simulate** route reads the cell for the current agency × sector × factor and filters items by the session's sub-type before injecting them into the analyst's system prompt.
- The **scorecard** route does the same filtering when injecting pitfalls and strong-answer markers into the scorecard generator.

Universal items (plain strings or objects with empty `sub_types`) always fire. Sub-type-tagged items only fire when the session's sub-type matches.
