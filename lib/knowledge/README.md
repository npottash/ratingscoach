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

Each JSON file has four arrays. All four are optional — leave any empty and the prompt will skip that section.

```json
{
  "real_questions": [
    "Verbatim or close-to-verbatim questions you have actually heard this agency ask on this factor."
  ],
  "common_pitfalls": [
    "Patterns where issuers consistently stumble on this factor. Used to sharpen the analyst's probing and the scorecard's flagging."
  ],
  "strong_answer_markers": [
    "What a good answer on this factor includes. Used by the scorecard to recognize strong responses."
  ],
  "agency_intel": [
    "Non-public observations on what this agency actually weighs heavily, versus what their methodology says."
  ]
}
```

### How to add content

You do not need to edit JSON yourself. Drop unstructured notes into a chat (a paragraph per factor is fine) and they will be structured into the right cell. Keep it in your voice; the schema is just for the model.

### How it flows into the product

- The **simulate** route injects the cell for the current agency × sector × factor into the system prompt as proprietary analyst knowledge.
- The **scorecard** route injects pitfalls and strong-answer markers for each factor so flagging and recommended actions reflect your experience.

If a cell is empty, both routes fall back to the static seed bank and general model knowledge.
