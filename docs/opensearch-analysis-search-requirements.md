# OpenSearch Analysis Search - Requirements Document

## Overview

A modern, intelligent search interface for spectroscopic analysis data indexed in OpenSearch. Enables chemists to quickly find NMR, IR, and MS analyses using natural language queries, numeric filters, and autocomplete suggestions.

## 1. User Stories

### 1.1 As a chemist, I want to:
- Search for analyses by typing natural queries like "1H NMR chloroform-d 7.26 ppm"
- Get autocomplete suggestions as I type
- Filter results by technique (NMR, IR, MS)
- Filter NMR results by nucleus (1H, 13C, etc.)
- Search for peaks in specific numeric ranges (ppm, cm⁻¹, m/z)
- See highlighted matches in search results
- Click a result to view the full analysis details
- Navigate to the sample/reaction containing the analysis

### 1.2 As a power user, I want to:
- Use advanced filters (date range, instrument, collection)
- Combine multiple search criteria
- Export search results
- Save frequently used searches

## 2. Functional Requirements

### 2.1 Search Bar
- **FR-1**: Modern search input with placeholder text explaining capabilities
- **FR-2**: Debounced input (300ms) to prevent excessive API calls
- **FR-3**: Clear button to reset search
- **FR-4**: Search on Enter key or button click
- **FR-5**: Show loading indicator during search

### 2.2 Autocomplete
- **FR-6**: Show suggestions after 2+ characters typed
- **FR-7**: Display up to 5-8 suggestions
- **FR-8**: Highlight matching portion of suggestion
- **FR-9**: Navigate suggestions with keyboard (↑↓ arrows, Enter, Esc)
- **FR-10**: Show technique type badge in suggestions (NMR, IR, MS)

### 2.3 Technique Filters
- **FR-11**: Toggle buttons/chips for: All, NMR, IR, MS
- **FR-12**: Sub-filters for NMR: 1H, 13C, 19F, 31P, etc.
- **FR-13**: Filters update results immediately
- **FR-14**: Show result count per technique

### 2.4 Numeric Range Filters
- **FR-15**: Auto-detect numeric values in query
- **FR-16**: Support ppm ranges: "7.0-7.3 ppm" or "7.0 to 7.3"
- **FR-17**: Support wavenumber ranges: "1700-1750 cm-1"
- **FR-18**: Support m/z values: "m/z 191"
- **FR-19**: Optional advanced panel for explicit range inputs

### 2.5 Search Results
- **FR-20**: Display results in card/list format
- **FR-21**: Show: technique badge, solvent, frequency, peak summary
- **FR-22**: Highlight matched text portions
- **FR-23**: Show parent sample/reaction name with link
- **FR-24**: Pagination (20 results per page)
- **FR-25**: Sort options: relevance, date, technique

### 2.6 Result Detail View
- **FR-26**: Modal or expandable card with full analysis data
- **FR-27**: Show parsed peaks table (chemical shift, multiplicity, J, integration)
- **FR-28**: Show raw text content
- **FR-29**: Link to navigate to parent sample in ELN

## 3. Technical Requirements

### 3.1 Frontend Components
```
src/components/searchModal/opensearch/
├── OpenSearchAnalysis.js       # Main container component
├── SearchInput.js              # Search bar with autocomplete
├── TechniqueFilters.js         # Filter chips/toggles
├── SearchResults.js            # Results list
├── SearchResultCard.js         # Individual result card
├── AnalysisDetailModal.js      # Detail view modal
├── NumericRangeFilter.js       # Optional advanced numeric filter
└── index.js                    # Exports
```

### 3.2 API Endpoints (Rails)
```ruby
# app/api/chemotion/opensearch_api.rb
GET  /api/v1/opensearch/search        # Main search
GET  /api/v1/opensearch/autocomplete  # Suggestions
GET  /api/v1/opensearch/filters       # Available filter options
```

### 3.3 OpenSearch Queries

#### Full-text Search
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "search_text": "1H NMR chloroform" } }
      ],
      "filter": [
        { "term": { "techniques": "NMR" } }
      ]
    }
  },
  "highlight": {
    "fields": { "search_text": {} }
  }
}
```

#### Autocomplete
```json
{
  "query": {
    "match_phrase_prefix": {
      "search_text.autocomplete": {
        "query": "1H NMR chlo",
        "max_expansions": 10
      }
    }
  },
  "size": 5,
  "_source": ["search_text", "techniques", "nmr_nucleus"]
}
```

#### Numeric Range (Nested Peaks)
```json
{
  "query": {
    "nested": {
      "path": "nmr_data.peaks",
      "query": {
        "range": {
          "nmr_data.peaks.chemical_shift": { "gte": 7.0, "lte": 7.3 }
        }
      }
    }
  }
}
```

### 3.4 OpenSearch Index Mapping Updates
Ensure the `chemotion-cdc-transformed` index has:
- `search_text.autocomplete` field with `edge_ngram` analyzer
- Nested mappings for peaks arrays
- Keyword fields for exact filtering

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-1**: Search response time < 200ms
- **NFR-2**: Autocomplete response time < 100ms
- **NFR-3**: Debounce input to limit API calls
- **NFR-4**: Cache filter options

### 4.2 Usability
- **NFR-5**: Mobile-responsive design
- **NFR-6**: Keyboard navigation support
- **NFR-7**: Clear visual feedback for loading/errors
- **NFR-8**: Accessible (ARIA labels, screen reader friendly)

### 4.3 Scalability
- **NFR-9**: Support 100k+ indexed documents
- **NFR-10**: Use `search_after` for deep pagination
- **NFR-11**: Efficient aggregations for facets

## 5. UI Mockup (Text-based)

```
┌─────────────────────────────────────────────────────────────────┐
│ [🔬 Analysis Search]                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐  [🔍] │
│  │ Search analyses: "1H NMR 7.26 ppm chloroform"       │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  Techniques: [All] [NMR ▼] [IR] [MS]                           │
│              └─ [1H] [13C] [19F] [31P]                          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Found 42 results (0.12s)                     Sort: [Relevance] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [NMR] 1H NMR (400 MHz, CDCl3)                           │   │
│  │ δ 7.26 (s, 1H), 4.12 (q, J=7.1 Hz, 2H), 1.25 (t, 3H)   │   │
│  │ Sample: Benzaldehyde derivative #42 → [View]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [IR] IR (neat)                                          │   │
│  │ 1720 (C=O), 1600 (C=C), 3400 (O-H) cm⁻¹                │   │
│  │ Sample: Carboxylic acid #17 → [View]                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [< Prev] Page 1 of 3 [Next >]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Implementation Phases

### Phase 1: Core Search (MVP)
- Search bar with full-text search
- Technique filter toggles
- Basic results list with pagination
- Link to sample

### Phase 2: Enhanced UX
- Autocomplete suggestions
- Highlighted matches
- Result detail modal
- Keyboard navigation

### Phase 3: Advanced Features
- Numeric range detection and filtering
- Advanced filters panel
- Export results
- Saved searches

### Phase 4: Semantic Search (Future)
- Vector embeddings for semantic similarity
- "Find similar analyses" feature
- Natural language understanding

## 7. Dependencies

- OpenSearch 2.x cluster with `chemotion-cdc-transformed` index
- React Bootstrap for UI components
- Rails API for proxying OpenSearch queries
- HTTParty or Faraday for HTTP calls

## 8. Success Metrics

- Search latency P95 < 200ms
- Autocomplete latency P95 < 100ms
- User finds relevant result in top 5 hits > 80% of time
- Zero downtime during index updates
