import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { SpectraEditor, FN } from '@complat/react-spectra-editor';

import { COMPARE_STATUS } from '../hooks/useCompareSpectra';
import {
  formatPks as formatPksOps,
  formatMpy as formatMpyOps,
  isNmrLayout,
} from '../formatters/spectraFormatters';

const layoutsWillShowMulti = [
  FN.LIST_LAYOUT.CYCLIC_VOLTAMMETRY,
  FN.LIST_LAYOUT.SEC,
  FN.LIST_LAYOUT.AIF,
  FN.LIST_LAYOUT.H1,
  FN.LIST_LAYOUT.C13,
  FN.LIST_LAYOUT.UVVIS,
  FN.LIST_LAYOUT.HPLC_UVVIS,
];

const buildOpsByLayout = ({
  entity,
  canUpdate,
  onWritePeak,
  onWriteMpy,
  onSave,
  onSaveClose,
  onWriteClosePeak,
  onWriteCloseMpy,
}) => {
  if (!entity) return [];
  const ops = [];
  if (canUpdate) {
    ops.push(
      { name: 'write peak & save', value: onWritePeak },
      { name: 'write peak, save & close', value: onWriteClosePeak },
    );
    if (isNmrLayout(entity.layout)) {
      ops.push(
        { name: 'write multiplicity & save', value: onWriteMpy },
        { name: 'write multiplicity, save & close', value: onWriteCloseMpy },
      );
    }
    ops.push(
      { name: 'save', value: onSave },
      { name: 'save & close', value: onSaveClose },
    );
  }
  return ops.filter((op, i, arr) => i === arr.findIndex((o) => o.name === op.name));
};

const renderEmpty = (onClose) => (
  <div className="d-flex h-100 justify-content-center align-items-center">
    <Alert variant="warning" className="text-center" onClick={onClose}>
      <Alert.Heading>
        <i className="fa fa-exclamation-triangle me-2" />
        No spectra to compare
      </Alert.Heading>
      <p>Please pick at least one spectrum from the list above.</p>
      <Button variant="warning" onClick={onClose}>Close window</Button>
    </Alert>
  </div>
);

const renderLoading = () => (
  <div className="d-flex h-100 justify-content-center align-items-center">
    <Spinner animation="border" role="status" variant="primary" />
  </div>
);

const renderError = ({ error, failures, onClose, onRetry }) => (
  <div className="d-flex h-100 justify-content-center align-items-center">
    <Alert variant="danger" className="text-center">
      <Alert.Heading>
        <i className="fa fa-chain-broken me-2" />
        Could not load spectra
      </Alert.Heading>
      <p>{error?.message || 'Unknown error'}</p>
      {Array.isArray(failures) && failures.length > 0 && (
        <ul className="text-start small">
          {failures.map((f) => (
            <li key={f.info?.idx}>
              {f.info?.info?.file?.name || `attachment ${f.info?.idx}`} &mdash; {f.reason}
            </li>
          ))}
        </ul>
      )}
      <div className="d-flex gap-2 justify-content-center mt-2">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            <i className="fa fa-refresh me-1" />
            Retry
          </Button>
        )}
        <Button variant="danger" onClick={onClose}>Close</Button>
      </div>
    </Alert>
  </div>
);

const renderFailureBanner = (failures) => {
  if (!Array.isArray(failures) || failures.length === 0) return null;
  return (
    <Alert variant="warning" className="m-2">
      <strong>Some spectra were skipped:</strong>
      <ul className="mb-0 small">
        {failures.map((f) => (
          <li key={f.info?.idx}>
            {f.info?.info?.file?.name || `attachment ${f.info?.idx}`} &mdash; {f.reason}
          </li>
        ))}
      </ul>
    </Alert>
  );
};

const contentOpsFromContainer = (container) => {
  const ops = container?.extended_metadata?.content?.ops;
  return Array.isArray(ops) ? ops : [];
};

const CompareSpectraBody = ({
  status,
  spectra,
  multiEntities,
  failures,
  error,
  saveError,
  container,
  sample,
  canUpdate,
  onClose,
  onRetry,
  onSave,
  onSaveClose,
  onWritePeak,
  onWriteMpy,
  onWriteClosePeak,
  onWriteCloseMpy,
  onDescriptionChanged,
}) => {
  const entityFileNames = useMemo(() => (
    container?.comparable_info?.list_attachments?.map((att) => att.filename) || null
  ), [container]);

  if (status === COMPARE_STATUS.LOADING) return renderLoading();
  if (status === COMPARE_STATUS.ERROR) {
    return renderError({ error, failures, onClose, onRetry });
  }
  if (!Array.isArray(multiEntities) || multiEntities.length === 0) {
    return renderEmpty(onClose);
  }

  const currEntity = multiEntities[multiEntities.length - 1];
  const operations = buildOpsByLayout({
    entity: currEntity,
    canUpdate,
    onWritePeak,
    onWriteMpy,
    onSave,
    onSaveClose,
    onWriteClosePeak,
    onWriteCloseMpy,
  });

  return (
    <div className="d-flex flex-column h-100">
      {saveError && (
        <Alert variant="danger" className="m-2" dismissible>
          {saveError.message || 'Save failed'}
        </Alert>
      )}
      {renderFailureBanner(failures)}
      <div className="flex-grow-1">
        <SpectraEditor
          entity={currEntity}
          multiEntities={multiEntities}
          entityFileNames={entityFileNames}
          operations={operations}
          descriptions={contentOpsFromContainer(container)}
          canChangeDescription={canUpdate}
          onDescriptionChanged={onDescriptionChanged}
        />
      </div>
    </div>
  );
};

CompareSpectraBody.propTypes = {
  status: PropTypes.string.isRequired,
  spectra: PropTypes.array,
  multiEntities: PropTypes.array,
  failures: PropTypes.array,
  error: PropTypes.object,
  saveError: PropTypes.object,
  container: PropTypes.object,
  sample: PropTypes.object,
  canUpdate: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onRetry: PropTypes.func,
  onSave: PropTypes.func,
  onSaveClose: PropTypes.func,
  onWritePeak: PropTypes.func,
  onWriteMpy: PropTypes.func,
  onWriteClosePeak: PropTypes.func,
  onWriteCloseMpy: PropTypes.func,
  onDescriptionChanged: PropTypes.func,
};

CompareSpectraBody.defaultProps = {
  spectra: [],
  multiEntities: [],
  failures: [],
  error: null,
  saveError: null,
  container: null,
  sample: null,
  canUpdate: true,
  onRetry: null,
  onSave: undefined,
  onSaveClose: undefined,
  onWritePeak: undefined,
  onWriteMpy: undefined,
  onWriteClosePeak: undefined,
  onWriteCloseMpy: undefined,
  onDescriptionChanged: undefined,
};

export { formatPksOps, formatMpyOps, layoutsWillShowMulti };
export default CompareSpectraBody;
