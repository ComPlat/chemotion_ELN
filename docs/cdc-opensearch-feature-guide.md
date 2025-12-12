# CDC to OpenSearch Feature Guide

## Overview

This document describes the Change Data Capture (CDC) pipeline that transforms unstructured spectroscopy analysis data from Chemotion ELN into structured, searchable documents in OpenSearch.

## Architecture

```
┌─────────────────────┐     ┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   PostgreSQL        │────▶│     Sequin      │────▶│  Chemotion          │────▶│   OpenSearch    │
│   (containers)      │ CDC │ (filter/xform)  │ HTTP│  Converter          │ API │   (indexed)     │
└─────────────────────┘     └─────────────────┘     └─────────────────────┘     └─────────────────┘
```

### Components

1. **PostgreSQL**: Source database with `containers` table containing analysis data
2. **Sequin**: CDC platform that captures changes and filters/transforms before sending
3. **Chemotion Converter**: Parses spectroscopy text (NMR, IR, MS) into structured JSON
4. **OpenSearch**: Full-text and structured search index

## Goals

- **Reliable full-text search** over all spectroscopy text (NMR, IR, MS, etc.)
- **Precise filtering** by technique, numeric fields (ppm, frequency)
- **Good performance** with efficient indexing
- **Forward compatibility** with vector/semantic search (embeddings)

---

## Container Hierarchy in Chemotion

Understanding the container hierarchy is crucial:

```
Sample (containable_type: "Sample", containable_id: <sample_id>)
└── root (container_type: "root")
    └── analyses (container_type: "analyses")
        └── analysis (container_type: "analysis")  ← Contains NMR/IR/MS content
            └── dataset (container_type: "dataset") ← Contains file references
```

**Important**: When an analysis is saved, multiple containers are updated:
- The `analysis` container itself
- The parent `analyses` container (updated_at changes)
- Possibly the `dataset` container

This explains why saving one analysis may create/update multiple OpenSearch documents.

---

## OpenSearch Document Structure

### Index: `chemotion-cdc-transformed`

```json
{
  // === IDENTITY FIELDS ===
  "id": 1364,                           // Container ID (primary key)
  "container_id": 1364,                 // Alias for clarity
  "sample_id": 100,                     // Resolved from container hierarchy
  "table": "containers",
  
  // === CONTAINER METADATA ===
  "name": "1H NMR Analysis",
  "container_type": "analysis",         // "root", "analyses", "analysis", "dataset"
  "description": "",
  "parent_id": 200,
  "containable_id": null,               // Only set on root container
  "containable_type": null,
  "created_at": "2025-12-10T10:18:43Z",
  "updated_at": "2025-12-10T11:08:16Z",
  
  // === TECHNIQUE CLASSIFICATION ===
  "techniques": ["nmr"],                // Array for fast filtering: nmr, ir, ms, uv, mp
  "technique_details": {
    "kind": "CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy",
    "status": "Confirmed",
    "instrument": null
  },
  
  // === FULL-TEXT SEARCH FIELD ===
  "search_text": "1H NMR 400 MHz Chloroform-d 7.27 ppm δ = 7.42 7.41 7.12 4.49 2.44 1.29 1.27 1H nuclear magnetic resonance spectroscopy",
  
  // === STRUCTURED ANALYSIS DATA ===
  "analyses": [
    {
      "type": "nmr",
      "parsed": true,
      "data": {
        "nucleus": "1H",
        "frequency_mhz": 400.0,
        "solvent": "Chloroform-d",
        "reference_ppm": 7.27,
        "peaks": [
          {"chemical_shift": 7.42, "multiplicity": "s", "integration": 1},
          {"chemical_shift": 7.41, "multiplicity": "d", "coupling_constants": [8.1], "integration": 2}
        ]
      }
    }
  ],
  
  // === FLATTENED NUMERIC FIELDS FOR RANGE QUERIES ===
  "nmr_chemical_shifts": [7.42, 7.41, 7.12, 4.49, 2.44, 1.29, 1.27],
  "nmr_frequency_mhz": 400.0,
  "nmr_nucleus": "1H",
  
  // === VECTOR EMBEDDINGS (FUTURE) ===
  "embeddings": {
    "model": "all-MiniLM-L6-v2",
    "vector": [0.123, -0.456, ...]      // 384-dim vector for semantic search
  },
  
  // === CDC METADATA ===
  "cdc_timestamp": "2025-12-10T11:08:16Z"
}
```

---

## Field Definitions

### Identity Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Container primary key |
| `container_id` | integer | Same as id, explicit alias |
| `sample_id` | integer | Resolved sample ID from container hierarchy |

### Technique Fields
| Field | Type | Description |
|-------|------|-------------|
| `techniques` | keyword[] | Array of detected techniques: `nmr`, `ir`, `ms`, `uv`, `mp` |
| `technique_details.kind` | text | CHMO ontology term if available |
| `technique_details.status` | keyword | Analysis status: Confirmed, Pending, etc. |

### Search Fields
| Field | Type | Description |
|-------|------|-------------|
| `search_text` | text | Concatenated searchable text (analyzed with custom analyzer) |

### Structured Data
| Field | Type | Description |
|-------|------|-------------|
| `analyses` | nested | Array of parsed analysis objects |
| `analyses[].type` | keyword | nmr, ir, ms, uv, mp |
| `analyses[].parsed` | boolean | Whether parsing succeeded |
| `analyses[].data` | object | Type-specific structured data |

### Flattened Numeric Fields (for range queries)
| Field | Type | Description |
|-------|------|-------------|
| `nmr_chemical_shifts` | float[] | All chemical shift values |
| `nmr_frequency_mhz` | float | NMR frequency |
| `nmr_nucleus` | keyword | 1H, 13C, 19F, 31P, etc. |
| `ir_wavenumbers` | float[] | IR peak wavenumbers (cm⁻¹) |
| `ms_mz_values` | float[] | MS m/z values |

---

## Index Mapping

```json
PUT /chemotion-cdc-transformed
{
  "settings": {
    "analysis": {
      "analyzer": {
        "spectroscopy_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "spectroscopy_synonyms"]
        }
      },
      "filter": {
        "spectroscopy_synonyms": {
          "type": "synonym",
          "synonyms": [
            "nmr, nuclear magnetic resonance",
            "ir, infrared",
            "ms, mass spectrometry, mass spec",
            "ppm, parts per million",
            "hz, hertz"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": {"type": "integer"},
      "container_id": {"type": "integer"},
      "sample_id": {"type": "integer"},
      "table": {"type": "keyword"},
      "name": {"type": "text"},
      "container_type": {"type": "keyword"},
      "techniques": {"type": "keyword"},
      "search_text": {
        "type": "text",
        "analyzer": "spectroscopy_analyzer"
      },
      "analyses": {
        "type": "nested",
        "properties": {
          "type": {"type": "keyword"},
          "parsed": {"type": "boolean"},
          "data": {"type": "object", "enabled": true}
        }
      },
      "nmr_chemical_shifts": {"type": "float"},
      "nmr_frequency_mhz": {"type": "float"},
      "nmr_nucleus": {"type": "keyword"},
      "ir_wavenumbers": {"type": "float"},
      "ms_mz_values": {"type": "float"},
      "cdc_timestamp": {"type": "date"}
    }
  }
}
```

---

## Query Examples

### 1. Full-text search across all spectroscopy data
```json
GET /chemotion-cdc-transformed/_search
{
  "query": {
    "match": {
      "search_text": "chloroform NMR 400 MHz"
    }
  }
}
```

### 2. Filter by technique
```json
GET /chemotion-cdc-transformed/_search
{
  "query": {
    "bool": {
      "must": [{"match": {"search_text": "7.03 ppm"}}],
      "filter": [{"term": {"techniques": "nmr"}}]
    }
  }
}
```

### 3. Range query on chemical shifts
```json
GET /chemotion-cdc-transformed/_search
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"techniques": "nmr"}},
        {"range": {"nmr_chemical_shifts": {"gte": 7.0, "lte": 8.0}}}
      ]
    }
  }
}
```

### 4. Nested query for specific peak properties
```json
GET /chemotion-cdc-transformed/_search
{
  "query": {
    "nested": {
      "path": "analyses",
      "query": {
        "bool": {
          "must": [
            {"term": {"analyses.type": "nmr"}},
            {"range": {"analyses.data.peaks.chemical_shift": {"gte": 7.0}}}
          ]
        }
      }
    }
  }
}
```

### 5. Find all analyses for a sample
```json
GET /chemotion-cdc-transformed/_search
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"sample_id": 100}},
        {"term": {"container_type": "analysis"}}
      ]
    }
  }
}
```

---

## Important Behaviors

### 1. Document Updates (not Creates)
The webhook uses the document ID `containers_{container_id}` to ensure updates overwrite existing documents rather than creating duplicates. OpenSearch's `PUT /_doc/{id}` semantics handle this automatically (upsert behavior).

### 2. Filtering by Container Type (Solves +2 Document Issue)
When saving an analysis in Chemotion, multiple containers are updated:
- The `analysis` container (content changes)
- The parent `analyses` container (updated_at changes)
- Associated `dataset` containers (file references)

To prevent indexing non-content containers, the Sequin filter function checks:
```elixir
# Only process containers of type 'analysis' (singular)
is_analysis = record["container_type"] == "analysis"
```

This ensures only `analysis` containers (with actual spectroscopy content) are indexed.

### 3. Sample ID Resolution
The `sample_id` is not directly stored on `analysis` containers. It requires traversing the container hierarchy:
- `analysis` → parent `analyses` → parent `root` → `containable_type=Sample`, `containable_id=sample_id`

Current implementation:
- Caches sample_id mappings from root containers
- Falls back to `null` if not cached

Future enhancement: Use Sequin SQL transform with JOIN to resolve sample_id at CDC time.

### 4. Field Deduplication (Optimized Structure)
Previous document structure had redundant fields:
- `content_raw` - raw JSON content
- `content_text` - plain text fallback  
- `analyses[].raw_text` - duplicate in each analysis
- `nmr_data[].raw_text` - another copy

Optimized structure uses:
- `search_text` - single searchable text field (max 10KB)
- `analyses[].data` - structured data without raw_text
- `techniques` - keyword array for filtering

---

## Future: Vector/Semantic Search

### Embeddings Pipeline
1. Generate embeddings for `search_text` using a model like `all-MiniLM-L6-v2`
2. Store embeddings in a `dense_vector` field
3. Use kNN search for semantic similarity

```json
"embeddings_vector": {
  "type": "dense_vector",
  "dims": 384,
  "index": true,
  "similarity": "cosine"
}
```

### Semantic Search Query
```json
GET /chemotion-cdc-transformed/_search
{
  "knn": {
    "field": "embeddings_vector",
    "query_vector": [0.123, -0.456, ...],
    "k": 10,
    "num_candidates": 100
  }
}
```

---

## Configuration Files

### Sequin Config
`/home/readam/chemotion_new/chemotion_ELN/sequin-deploy/config/sequin.yaml`

### Converter CDC Module
`/home/readam/chemotion-converter-app/converter_app/cdc/`
- `parsers.py` - NMR/IR/MS text parsing
- `router.py` - Webhook endpoint and OpenSearch indexing

### OpenSearch Index Settings
For production, index settings should be applied via:
1. An init container that creates the index with mappings
2. Index templates that apply settings automatically
3. Or manual setup documented in deployment scripts

---

## Production Considerations

1. **Index Templates**: Create index templates so settings are applied to new indices automatically
2. **Reindex Strategy**: Plan for reindexing when mapping changes
3. **Backup**: Configure OpenSearch snapshots
4. **Monitoring**: Set up alerts for failed CDC deliveries
5. **Authentication**: Enable OpenSearch security in production

---

## Troubleshooting

### Check Sequin Consumer Status
```bash
docker logs chemotion_eln-sequin-1 2>&1 | grep -E "(Failed|error|delivered)"
```

### Check OpenSearch Document Count
```bash
curl -s "http://localhost:9200/chemotion-cdc-transformed/_count?pretty"
```

### View Recent Documents
```bash
curl -s "http://localhost:9200/chemotion-cdc-transformed/_search?pretty&size=5&sort=cdc_timestamp:desc"
```

### Manual Reindex of Container
```bash
curl -X POST http://localhost:4000/cdc/reindex -H "Content-Type: application/json" -d '{"container_id": 1364}'
```
