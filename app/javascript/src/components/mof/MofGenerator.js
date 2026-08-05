import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Button, Spinner
} from 'react-bootstrap';
import Dropzone from 'src/components/common/Dropzone';
import MofFetcher from 'src/fetchers/MofFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';

const CIF_ACCEPT = { 'chemical/x-cif': ['.cif'], 'text/plain': ['.cif'] };

const readFileText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsText(file);
});

/**
 * MOF CIF panel: drop analyzes immediately → Clear → results table.
 */
const MofGenerator = ({ onResult, initialResult, disabled }) => {
  const hasMof = UIStore.getState().hasMof;
  const [filename, setFilename] = useState(initialResult?.filename || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(initialResult);

  useEffect(() => {
    setResult(initialResult || null);
    setFilename(initialResult?.filename || null);
  }, [initialResult]);

  const persist = useCallback((payload) => {
    setResult(payload);
    if (payload?.filename) setFilename(payload.filename);
    if (onResult) onResult({ result: payload });
  }, [onResult]);

  const handleClear = useCallback(() => {
    setFilename(null);
    setError(null);
    persist(null);
  }, [persist]);

  const analyzeFile = useCallback(async (file) => {
    if (!file || submitting || disabled || !hasMof) return;

    setFilename(file.name);
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const cif = await readFileText(file);
      const response = await MofFetcher.analyze(cif);
      if (!response?.mofid) {
        setError(response?.error || 'The MOF service could not analyze this CIF file.');
        return;
      }
      persist({ ...response, filename: file.name });
    } catch (e) {
      setError(e?.message || 'MOFid conversion failed');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, disabled, hasMof, persist]);

  const onDropAccepted = useCallback((acceptedFiles) => {
    const file = acceptedFiles?.[0];
    if (!file) return;
    if (!/\.cif$/i.test(file.name)) {
      setError('Only .cif files are accepted');
      return;
    }
    analyzeFile(file);
  }, [analyzeFile]);

  const onDropRejected = useCallback(() => {
    setError('Only .cif files are accepted');
  }, []);

  const dropDisabled = disabled || !hasMof;

  return (
    <div className="mof-generator">
      <p className="text-muted small mb-3">
        Upload a CIF to generate a MOFid and MOFkey (building-block SMILES and topology included).
        Structures should be 3D frameworks without disorder; remove non-framework solvent when possible.
      </p>

      {!hasMof && (
        <Alert variant="warning" className="py-2">
          The MOF service is not configured on this instance. CIF analysis is unavailable.
        </Alert>
      )}

      {!dropDisabled && (
        <Dropzone
          multiple={false}
          accept={CIF_ACCEPT}
          onDropAccepted={onDropAccepted}
          onDropRejected={onDropRejected}
          className="attachment-dropzone mb-3"
        >
          {submitting ? (
            <span>
              <Spinner animation="border" size="sm" className="me-2" />
              Processing
              {filename ? ` ${filename}` : ''}
              …
            </span>
          ) : (
            <span>
              {filename ? `${filename} — ` : ''}
              Drop a .cif file here, or click to upload
            </span>
          )}
        </Dropzone>
      )}

      {error && (
        <Alert variant="danger" className="py-2" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {result && !disabled && (
        <div className="mb-3">
          <Button variant="outline-secondary" disabled={submitting} onClick={handleClear}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};

MofGenerator.propTypes = {
  onResult: PropTypes.func,
  initialResult: PropTypes.shape({
    mofid: PropTypes.string,
    mofkey: PropTypes.string,
    topology: PropTypes.string,
    smiles: PropTypes.string,
    filename: PropTypes.string,
  }),
  disabled: PropTypes.bool,
};

MofGenerator.defaultProps = {
  onResult: null,
  initialResult: null,
  disabled: false,
};

export default MofGenerator;
