import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Form, InputGroup, Button, Badge, Spinner, Alert, Row, Col
} from 'react-bootstrap';
import TechniqueFilters from './opensearch/TechniqueFilters';
import SearchResults from './opensearch/SearchResults';
import AnalysisDetailModal from './opensearch/AnalysisDetailModal';

/**
 * OpenSearch Analysis Explorer - Modern search interface for spectroscopic data
 * Supports full-text search, autocomplete, technique filters, and numeric range detection
 */
const OpenSearchAnalysis = () => {
  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTime, setSearchTime] = useState(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Filters state
  const [activeTechnique, setActiveTechnique] = useState('all');
  const [activeNucleus, setActiveNucleus] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Detail modal state
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Refs
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  /**
   * Fetch autocomplete suggestions
   */
  const fetchSuggestions = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        technique: activeTechnique !== 'all' ? activeTechnique : '',
        nucleus: activeNucleus || ''
      });

      const response = await fetch(`/api/v1/opensearch/autocomplete?${params}`, {
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(data.suggestions?.length > 0);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  }, [activeTechnique, activeNucleus]);

  /**
   * Perform search
   */
  const performSearch = useCallback(async (searchQuery, pageNum = 1) => {
    if (!searchQuery?.trim()) {
      setResults([]);
      setTotalHits(0);
      return;
    }

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        technique: activeTechnique !== 'all' ? activeTechnique : '',
        nucleus: activeNucleus || '',
        page: pageNum.toString(),
        size: pageSize.toString()
      });

      const startTime = performance.now();
      const response = await fetch(`/api/v1/opensearch/search?${params}`, {
        headers: { Accept: 'application/json' }
      });
      const endTime = performance.now();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.hits || []);
      setTotalHits(data.total || 0);
      setSearchTime(Math.round(endTime - startTime));
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
      setResults([]);
      setTotalHits(0);
    } finally {
      setLoading(false);
    }
  }, [activeTechnique, activeNucleus, pageSize]);

  /**
   * Handle input change with debounced autocomplete
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedSuggestionIndex(-1);

    // Debounce autocomplete
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  /**
   * Handle keyboard navigation in suggestions
   */
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch(query, 1);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selected = suggestions[selectedSuggestionIndex];
          setQuery(selected.text || selected);
          setShowSuggestions(false);
          performSearch(selected.text || selected, 1);
        } else {
          performSearch(query, 1);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
      default:
        break;
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion) => {
    const text = suggestion.text || suggestion;
    setQuery(text);
    setShowSuggestions(false);
    performSearch(text, 1);
  };

  /**
   * Handle search button click
   */
  const handleSearch = () => {
    setShowSuggestions(false);
    performSearch(query, 1);
  };

  /**
   * Handle clear search
   */
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setTotalHits(0);
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    searchInputRef.current?.focus();
  };

  /**
   * Handle filter change - re-search with new filters
   */
  const handleTechniqueChange = (technique) => {
    setActiveTechnique(technique);
    setActiveNucleus(null);
    if (query.trim()) {
      // Will trigger search via useEffect
    }
  };

  const handleNucleusChange = (nucleus) => {
    setActiveNucleus(nucleus);
    if (query.trim()) {
      // Will trigger search via useEffect
    }
  };

  /**
   * Handle result click - show detail modal
   */
  const handleResultClick = (result) => {
    setSelectedResult(result);
    setShowDetailModal(true);
  };

  /**
   * Handle pagination
   */
  const handlePageChange = (newPage) => {
    performSearch(query, newPage);
  };

  /**
   * Re-search when filters change
   */
  useEffect(() => {
    if (query.trim()) {
      performSearch(query, 1);
    }
  }, [activeTechnique, activeNucleus]);

  /**
   * Cleanup debounce timer
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const totalPages = Math.ceil(totalHits / pageSize);

  return (
    <div className="opensearch-analysis p-3">
      {/* Search Header */}
      <div className="mb-4">
        <h5 className="mb-3 d-flex align-items-center justify-content-center">
          <i className="fa fa-flask me-2 text-primary" />
          Analysis Explorer
          <Badge bg="success" className="ms-2 fw-normal">OpenSearch</Badge>
        </h5>

        {/* Search Input - centered at 2/3 width */}
        <Row className="justify-content-center">
          <Col md={8} lg={8}>
            <div className="position-relative">
              <InputGroup size="lg">
                <Form.Control
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search: 1H NMR 7.26 ppm, IR 1720 cm-1, CDCl3 400 MHz..."
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  autoComplete="off"
                  aria-label="Search analyses"
                  aria-describedby="search-help"
                />
            {query && (
              <Button
                variant="outline-secondary"
                onClick={handleClear}
                title="Clear search"
              >
                <i className="fa fa-times" />
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <i className="fa fa-search" />
              )}
            </Button>
          </InputGroup>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="autocomplete-dropdown position-absolute w-100 bg-white border rounded shadow-sm mt-1" style={{ zIndex: 1050 }}>
              {suggestions.map((suggestion, index) => {
                const text = suggestion.text || suggestion;
                const technique = suggestion.technique || '';
                return (
                  <div
                    key={index}
                    className={`autocomplete-item px-3 py-2 d-flex align-items-center ${
                      index === selectedSuggestionIndex ? 'bg-primary text-white' : ''
                    }`}
                    style={{ cursor: 'pointer' }}
                    onMouseDown={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    <i className="fa fa-search me-2 opacity-50" />
                    <span className="flex-grow-1">{text}</span>
                    {technique && (
                      <Badge bg="secondary" className="ms-2 text-uppercase" style={{ fontSize: '0.7em' }}>
                        {technique}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
            <small id="search-help" className="text-muted d-block text-center mt-2">
              Search by chemical shift (ppm), wavenumber (cm⁻¹), m/z, solvent, or any text
            </small>
          </Col>
        </Row>
      </div>

      {/* Technique Filters */}
      <TechniqueFilters
        activeTechnique={activeTechnique}
        activeNucleus={activeNucleus}
        onTechniqueChange={handleTechniqueChange}
        onNucleusChange={handleNucleusChange}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mt-3">
          <i className="fa fa-exclamation-triangle me-2" />
          {error}
        </Alert>
      )}

      {/* Results Summary */}
      {!loading && query && results.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3 mb-2 text-muted">
          <span>
            Found <strong>{totalHits.toLocaleString()}</strong> {totalHits === 1 ? 'result' : 'results'}
            {searchTime && <span className="ms-1">({searchTime}ms)</span>}
          </span>
          {totalPages > 1 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Searching analyses...</p>
        </div>
      )}

      {/* No Results */}
      {!loading && query && results.length === 0 && !error && (
        <div className="text-center py-5 text-muted">
          <i className="fa fa-search fa-3x mb-3 opacity-25" />
          <p>No analyses found for "{query}"</p>
          <small>Try different keywords or adjust your filters</small>
        </div>
      )}

      {/* Search Results */}
      {!loading && results.length > 0 && (
        <SearchResults
          results={results}
          onResultClick={handleResultClick}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Empty State */}
      {!loading && !query && results.length === 0 && (
        <div className="text-center py-5 text-muted">
          <i className="fa fa-flask fa-3x mb-3 opacity-25" />
          <p>Enter a search query to explore spectroscopic analyses</p>
          <div className="mt-3">
            <Badge bg="light" text="dark" className="me-2 mb-2">1H NMR 400 MHz</Badge>
            <Badge bg="light" text="dark" className="me-2 mb-2">7.26 ppm doublet</Badge>
            <Badge bg="light" text="dark" className="me-2 mb-2">IR 1720 cm-1</Badge>
            <Badge bg="light" text="dark" className="me-2 mb-2">HRMS m/z 344</Badge>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnalysisDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        analysis={selectedResult}
      />
    </div>
  );
};

export default OpenSearchAnalysis;
