#!/usr/bin/env node
/**
 * Ingest text files from /knowledge into the Supabase knowledge_base table
 * with OpenAI text-embedding-3-small embeddings.
 *
 * Usage:
 *   npm run ingest          # ingest new files only (skip already-present sources)
 *   npm run ingest -- --force   # delete existing chunks for each file and re-ingest
 *
 * Required env (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (NOT the anon key — must bypass RLS)
 *   OPENAI_API_KEY
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge')
const CHUNK_WORDS = 500
const EMBED_BATCH = 64
const EMBED_MODEL = 'text-embedding-3-small'

const force = process.argv.includes('--force')

type KnowledgeRow = {
  category: string
  content: string
  tags: string[]
  embedding: number[]
}

function chunkText(text: string, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const out: string[] = []
  for (let i = 0; i < words.length; i += size) {
    out.push(words.slice(i, i + size).join(' '))
  }
  return out
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(
        `No /knowledge directory found at ${dir}. Create it and drop .txt or .md files in.`
      )
      process.exit(1)
    }
    throw err
  }
  for (const entry of entries) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(p)
    } else if (entry.isFile() && /\.(txt|md)$/i.test(entry.name)) {
      // Skip docs and scratch files — they aren't corpus content.
      if (/^README\.md$/i.test(entry.name) || entry.name.startsWith('_')) {
        continue
      }
      yield p
    }
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!openaiKey) missing.push('OPENAI_API_KEY')
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl!, serviceKey!, {
    auth: { persistSession: false },
  })
  const openai = new OpenAI({ apiKey: openaiKey })

  let totalFiles = 0
  let totalChunks = 0
  let totalSkipped = 0

  for await (const path of walk(KNOWLEDGE_DIR)) {
    const source = relative(KNOWLEDGE_DIR, path)
    totalFiles++

    const { count: existing } = await supabase
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('category', source)

    if ((existing ?? 0) > 0) {
      if (!force) {
        console.log(`skip   ${source} (${existing} chunks already present)`)
        totalSkipped++
        continue
      }
      console.log(`clear  ${source} (${existing} existing chunks)`)
      const { error: delErr } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('category', source)
      if (delErr) {
        console.error(`  failed to clear ${source}: ${delErr.message}`)
        process.exit(1)
      }
    }

    const text = await readFile(path, 'utf8')
    const chunks = chunkText(text, CHUNK_WORDS)
    if (chunks.length === 0) {
      console.log(`empty  ${source}`)
      continue
    }

    console.log(`embed  ${source} (${chunks.length} chunks)`)

    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH)

      const resp = await openai.embeddings.create({
        model: EMBED_MODEL,
        input: batch,
      })

      const rows: KnowledgeRow[] = batch.map((content, j) => ({
        category: source,
        content,
        tags: [`chunk:${i + j}`],
        embedding: resp.data[j].embedding,
      }))

      const { error: insertErr } = await supabase
        .from('knowledge_base')
        .insert(rows)
      if (insertErr) {
        console.error(`  insert failed for ${source}: ${insertErr.message}`)
        process.exit(1)
      }

      totalChunks += batch.length
    }
  }

  console.log('')
  console.log(
    `Done. ${totalFiles} file(s) scanned, ${totalSkipped} skipped, ${totalChunks} chunk(s) embedded and inserted.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
