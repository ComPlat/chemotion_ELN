import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Button, Badge, Alert
} from 'react-bootstrap';

/**
 * Modal that displays (and lets a user hand-correct) the structured JSON
 * produced by the spectral_extraction AI task for one analysis measurement
 * (NMR, MS/HRMS, IR, UV-Vis, HPLC/GC, ..etc).
 *
 * This is a pure display/edit component — it does not call the API itself.
 * ContainerComponent owns the single "run" action (POST /api/v1/llm/spectral/extract)
 * and passes down whatever `result` it currently has (persisted in
 * container.extended_metadata.ai_spectral_data).
 *
 * Editing: the "Edit" toggle swaps the read-only <pre> for a textarea seeded
 * with the current JSON. Toggling back to read mode parses the edited text —
 * on success it's reported via `onResultChange` (ContainerComponent merges it
 * into container.extended_metadata.ai_spectral_data.result, so it is included
 * in the next Sample save like any other analysis field); on invalid JSON it
 * stays in edit mode with an inline error instead of silently discarding it.
 */
const AnalysisParserModal = ({
  show, onHide, result, onResultChange
}) => {
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editError, setEditError] = useState(null);

  const resultJson = () => JSON.stringify(result?.result ?? {}, null, 2);

  const handleClose = () => {
    setEditMode(false);
    setEditedText('');
    setEditError(null);
    onHide();
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([resultJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(result.technique || 'analysis')}_structured.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!result) return;
    const json = resultJson();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = json;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Clipboard access denied — Copy button simply stays as-is; nothing to recover.
    }
  };

  const handleToggleEdit = () => {
    if (!editMode) {
      setEditedText(resultJson());
      setEditError(null);
      setEditMode(true);
      return;
    }

    try {
      const parsed = JSON.parse(editedText);
      setEditError(null);
      setEditMode(false);
      onResultChange(parsed);
    } catch (e) {
      setEditError(`Invalid JSON — fix it before switching back to read mode: ${e.message}`);
    }
  };

  const renderContent = () => {
    if (!result) {
      return <div className="text-center text-muted py-4">No data available yet — run the AI structuring first.</div>;
    }

    const extractedAtLabel = result.extracted_at
      ? new Date(result.extracted_at).toLocaleString()
      : null;

    return (
      <div>
        <div className="mb-3 d-flex align-items-center flex-wrap gap-2">
          <strong>Detected technique:</strong>
          <Badge bg="primary" className="text-uppercase">{result.technique_label || result.technique}</Badge>
        </div>

        <div>
          <div className="d-flex align-items-center justify-content-between">
            <strong>Structured data:</strong>
            <Button variant="light" size="sm" onClick={handleToggleEdit}>
              <i className={`fa ${editMode ? 'fa-check' : 'fa-pencil'} me-1`} aria-hidden="true" />
              {editMode ? 'Done' : 'Edit'}
            </Button>
          </div>

          {editError && (
            <Alert variant="danger" className="mt-2 mb-0 py-2">
              {editError}
            </Alert>
          )}

          {editMode ? (
            <textarea
              className="form-control bg-dark text-light mt-1"
              style={{
                height: '400px', overflow: 'auto', fontSize: '0.8em', fontFamily: 'monospace'
              }}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <pre
              className="bg-dark text-light p-3 rounded mt-1"
              style={{ maxHeight: '400px', overflow: 'auto', fontSize: '0.8em' }}
            >
              {resultJson()}
            </pre>
          )}
        </div>

        <p className="text-muted small mb-1 mt-2">
          {extractedAtLabel && `Extracted at: ${extractedAtLabel}`}
          {result.model && `, structured using ${result.model}`}
          {result.requested_model && result.requested_model !== result.model
            && ` (requested ${result.requested_model} — unavailable, fell back to default)`}
          {result.edited_at && ' (manually edited)'}
        </p>
        <p className="text-muted small mb-0">
          <i className="fa fa-exclamation-triangle me-1" aria-hidden="true" />
          AI/LLM can make mistakes — we recommend verifying the structured data against
          the original measurement text.
        </p>
      </div>
    );
  };

  const footerBtnStyle = {
    height: '38px',
    minWidth: '135px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Modal centered show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="ai-sparkle-icon me-2" aria-hidden="true">✨</span>
          Structured Analysis Data
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {renderContent()}
      </Modal.Body>
      <Modal.Footer className="border-0 gap-2" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
        <Button variant="light" onClick={handleCopy} disabled={!result} style={footerBtnStyle}>
          <i className="fa fa-copy me-2" aria-hidden="true" />
          <span className="text-nowrap">{copied ? 'Copied!' : 'Copy JSON'}</span>
        </Button>
        <Button variant="primary" onClick={handleDownload} disabled={!result} style={footerBtnStyle}>
          <i className="fa fa-download me-2" aria-hidden="true" />
          <span className="text-nowrap">Download JSON</span>
        </Button>
        <Button variant="light" onClick={handleClose} style={footerBtnStyle}>
          <span className="text-nowrap">Close</span>
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

AnalysisParserModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  result: PropTypes.object,
  onResultChange: PropTypes.func.isRequired,
};

AnalysisParserModal.defaultProps = {
  result: null,
};

export default AnalysisParserModal;
