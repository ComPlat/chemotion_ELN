import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';

export default function MergeSampleModal({
  show,
  onHide,
  sourceProduct,
  targetProduct,
  onMerge,
  onReorder,
}) {
  const [step, setStep] = useState('choose');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setStep('choose');
      setLoading(false);
    }
  }, [show]);

  const materialLabel = (material, fallback) => {
    if (!material) return fallback;
    const label = material.short_label || fallback;
    return material.name ? `${label} (${material.name})` : label;
  };

  const sourceLabel = materialLabel(sourceProduct, 'Source');
  const targetLabel = materialLabel(targetProduct, 'Target');

  const handleReorder = () => {
    if (onReorder) onReorder(sourceProduct, targetProduct);
    onHide();
  };

  const handleMergeConfirm = () => {
    if (!onMerge) {
      onHide();
      return;
    }
    setLoading(true);
    Promise.resolve(onMerge(sourceProduct, targetProduct))
      .then(() => onHide())
      .catch(() => setLoading(false));
  };

  if (step === 'choose') {
    return (
      <AppModal
        show={show}
        onHide={onHide}
        title="Move or Merge?"
        primaryActionLabel="Merge"
        onPrimaryAction={() => setStep('confirm')}
        extendedFooter={(
          <Button variant="secondary" onClick={handleReorder}>
            Reorder
          </Button>
        )}
      >
        <p>
          <strong>{sourceLabel}</strong>
          {' was dropped onto '}
          <strong>{targetLabel}</strong>
          .
        </p>
        <p className="text-muted small mb-0">
          Choose <strong>Reorder</strong> to change the position, or <strong>Merge</strong> to combine the amounts.
        </p>
      </AppModal>
    );
  }

  return (
    <AppModal
      show={show}
      onHide={onHide}
      onRequestClose={(_, source) => {
        if (loading) return;
        if (source === 'footer') setStep('choose');
        else onHide();
      }}
      title="Confirm Merge"
      closeLabel="Back"
      primaryActionLabel={loading ? 'Merging…' : 'Confirm Merge'}
      primaryActionDisabled={loading}
      onPrimaryAction={handleMergeConfirm}
    >
      <p>
        {'Merge '}
        <strong>{sourceLabel}</strong>
        {' into '}
        <strong>{targetLabel}</strong>
        ?
      </p>
      <ul className="mb-0">
        <li>
          {'The real amount of '}
          <strong>{sourceLabel}</strong>
          {' will be added to '}
          <strong>{targetLabel}</strong>
          .
        </li>
        <li>
          <strong>{sourceLabel}</strong>
          {' will be marked as Legacy and removed from the materials list.'}
        </li>
      </ul>
    </AppModal>
  );
}

MergeSampleModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  sourceProduct: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    short_label: PropTypes.string,
    name: PropTypes.string,
  }),
  targetProduct: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    short_label: PropTypes.string,
    name: PropTypes.string,
  }),
  onMerge: PropTypes.func,
  onReorder: PropTypes.func,
};

MergeSampleModal.defaultProps = {
  sourceProduct: null,
  targetProduct: null,
  onMerge: null,
  onReorder: null,
};
