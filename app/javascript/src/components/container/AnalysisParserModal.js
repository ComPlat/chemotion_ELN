import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Button, Spinner, Alert
} from 'react-bootstrap';

/**
 * Modal component for displaying parsed analysis data from the converter app.
 * Fetches structured JSON representation of spectroscopic analysis content.
 */
const AnalysisParserModal = ({ show, onHide, content }) => {
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchParsedContent = async () => {
    if (!content) {
      setError('No content to parse');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Content can be a Quill Delta object or a string
      // Send it as-is since the API accepts both
      const response = await fetch('/api/v1/converter/parse_analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      setParsedData(data);
      setHasFetched(true);
    } catch (err) {
      setError(err.message || 'Failed to parse content');
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShow = () => {
    if (!hasFetched) {
      fetchParsedContent();
    }
  };

  const handleClose = () => {
    onHide();
    // Reset state when modal closes
    setParsedData(null);
    setError(null);
    setHasFetched(false);
  };

  const handleDownload = () => {
    if (!parsedData) return;

    const jsonString = JSON.stringify(parsedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analysis_parsed.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!parsedData) return;
    const jsonString = JSON.stringify(parsedData, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonString);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = jsonString;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('Copy failed');
    }
  };

  const handleRefresh = () => {
    setHasFetched(false);
    fetchParsedContent();
  };

  // Fetch when modal becomes visible
  React.useEffect(() => {
    if (show && !hasFetched && !loading) {
      fetchParsedContent();
    }
  }, [show]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Parsing analysis content...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="danger">
          <Alert.Heading>Parsing Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      );
    }

    if (!parsedData) {
      return (
        <div className="text-center text-muted py-4">
          No data available
        </div>
      );
    }

    return (
      <div>
        {/* Analysis type badge (single analysis) */}
        {parsedData.type && (
          <div className="mb-3">
            <strong>Detected Techniques: </strong>
            <span className="badge bg-primary text-uppercase">{parsedData.type}</span>
          </div>
        )}
        {/* For array of analyses, show count and types */}
        {Array.isArray(parsedData) && (
          <div className="mb-3">
            <span className="badge bg-secondary me-2">{parsedData.length} analyses</span>
            {parsedData.map((a, i) => (
              <span key={i} className="badge bg-primary ms-1 text-uppercase">{a.type || 'unknown'}</span>
            ))}
          </div>
        )}

        {/* Parsed JSON */}
        <div>
          <strong>Parsed Structure:</strong>
          <pre
            className="bg-dark text-light p-3 rounded mt-1"
            style={{
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.8em'
            }}
          >
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Modal
      centered
      show={show}
      onHide={handleClose}
      onShow={handleShow}
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fa fa-flask me-2" />
          Parsed Analysis Data
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {renderContent()}
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button
          variant="outline-secondary"
          onClick={handleRefresh}
          disabled={loading}
        >
          <i className="fa fa-refresh me-1" />
          Refresh
        </Button>
        <Button
          variant="outline-secondary"
          onClick={handleCopy}
          disabled={!parsedData || loading}
          className="d-inline-flex align-items-center justify-content-center px-3 py-1"
          style={{ width: '120px' }}
        >
          <i className="fa fa-copy me-2" aria-hidden="true" />
          <span className="text-nowrap">{copied ? 'Copied!' : 'Copy JSON'}</span>
        </Button>
        <Button
          variant="success"
          onClick={handleDownload}
          disabled={!parsedData || loading}
        >
          <i className="fa fa-download me-1" />
          Download JSON
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

AnalysisParserModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ])
};

AnalysisParserModal.defaultProps = {
  content: null
};

export default AnalysisParserModal;
