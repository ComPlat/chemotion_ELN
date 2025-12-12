import React from 'react';
import PropTypes from 'prop-types';
import { Card, Badge, Button } from 'react-bootstrap';

/**
 * Individual search result card with highlighted text
 */
const SearchResultCard = ({ result, onClick }) => {
  const source = result._source || result;
  const highlights = result.highlight || {};

  // Extract key fields
  const technique = source.techniques?.[0] || source.nmr_nucleus ? 'NMR' : (source.ir_data ? 'IR' : (source.ms_data ? 'MS' : 'Unknown'));
  const nucleus = source.nmr_nucleus || '';
  const frequency = source.nmr_frequency_mhz ? `${source.nmr_frequency_mhz} MHz` : '';
  const solvent = source.nmr_solvent || '';
  const searchText = source.search_text || '';
  const containerName = source.container_name || 'Analysis';
  const sampleName = source.sample_name || '';
  const updatedAt = source.updated_at ? new Date(source.updated_at).toLocaleDateString() : '';

  // Get highlighted text or fall back to original
  const getHighlightedText = () => {
    if (highlights.search_text && highlights.search_text.length > 0) {
      // OpenSearch returns highlighted fragments with <em> tags
      return highlights.search_text.join(' ... ');
    }
    // Truncate long text
    if (searchText.length > 200) {
      return searchText.substring(0, 200) + '...';
    }
    return searchText;
  };

  // Get technique badge color
  const getTechniqueBadge = () => {
    switch (technique.toUpperCase()) {
      case 'NMR':
        return 'primary';
      case 'IR':
        return 'success';
      case 'MS':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Format peaks summary
  const getPeaksSummary = () => {
    if (source.nmr_data?.peaks?.length > 0) {
      const peaks = source.nmr_data.peaks.slice(0, 5);
      return peaks.map((p) => `${p.chemical_shift?.toFixed(2)} ppm`).join(', ');
    }
    if (source.ir_data?.peaks?.length > 0) {
      const peaks = source.ir_data.peaks.slice(0, 5);
      return peaks.map((p) => `${p.wavenumber} cm⁻¹`).join(', ');
    }
    if (source.ms_data?.peaks?.length > 0) {
      const peaks = source.ms_data.peaks.slice(0, 5);
      return peaks.map((p) => `m/z ${p.mz}`).join(', ');
    }
    return null;
  };

  const peaksSummary = getPeaksSummary();

  return (
    <Card
      className="search-result-card mb-2 border-0 shadow-sm"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
    >
      <Card.Body className="py-3">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            {/* Header with technique and metadata */}
            <div className="d-flex align-items-center mb-2 flex-wrap gap-2">
              <Badge bg={getTechniqueBadge()} className="text-uppercase">
                {technique}
              </Badge>
              {nucleus && (
                <Badge bg="info" className="text-uppercase">
                  {nucleus}
                </Badge>
              )}
              {frequency && (
                <span className="text-muted small">{frequency}</span>
              )}
              {solvent && (
                <span className="text-muted small">• {solvent}</span>
              )}
              {updatedAt && (
                <span className="text-muted small ms-auto">{updatedAt}</span>
              )}
            </div>

            {/* Main text with highlights */}
            <div
              className="search-text mb-2"
              style={{
                fontSize: '0.95em',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
              dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
            />

            {/* Peaks summary */}
            {peaksSummary && (
              <div className="peaks-summary text-muted small">
                <i className="fa fa-bar-chart me-1" />
                Peaks: {peaksSummary}
                {source.nmr_data?.peaks?.length > 5 && ` (+${source.nmr_data.peaks.length - 5} more)`}
              </div>
            )}

            {/* Sample/container link */}
            {(sampleName || containerName) && (
              <div className="mt-2">
                <small className="text-muted">
                  <i className="fa fa-flask me-1" />
                  {sampleName && <span className="fw-medium">{sampleName}</span>}
                  {sampleName && containerName && ' → '}
                  {containerName}
                </small>
              </div>
            )}
          </div>

          {/* View button */}
          <Button
            variant="outline-primary"
            size="sm"
            className="ms-3 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <i className="fa fa-eye me-1" />
            View
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

SearchResultCard.propTypes = {
  result: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired
};

export default SearchResultCard;
