## Raw knowledge corpus

Drop `.txt` and `.md` files into this directory (subfolders allowed). Run:

```
npm run ingest
```

Each file is chunked into ~500-word segments, embedded with OpenAI `text-embedding-3-small`, and inserted into the `knowledge_base` Supabase table. Already-ingested files are skipped; pass `-- --force` to wipe and re-ingest.

This is different from `lib/knowledge/` — that folder holds the **structured** proprietary overlay (JSON cells injected directly into prompts). `/knowledge` is the **raw RAG corpus** (long-form text retrieved at query time).
