import React from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

const METRIC_PREFIXES = ['m', 'n', 'u'];
const METRIC_PREFIXES_MOL = ['m', 'n'];

function getMetricPrefix(material, index, prefixes) {
  return (
    material.metrics
    && material.metrics.length > 2
    && prefixes.includes(material.metrics[index])
  ) ? material.metrics[index]
    : 'm';
}

function MaterialCalculations({ material }) {
  const renderMaterialVolume = () => {
    if (material.contains_residues) {
      return <Form.Control type="text" value="N / A" disabled />;
    }

    const metric = getMetricPrefix(material, 1, METRIC_PREFIXES);

    return (
      <NumeralInputWithUnitsCompo
        className="reaction-material__volume-input"
        value={material.amount_ml || ''}
        unit="l"
        metricPrefix={metric}
        metricPrefixes={METRIC_PREFIXES}
        precision={5}
        disabled
        readOnly
        size="sm"
      />
    );
  };

  const metric = getMetricPrefix(material, 0, METRIC_PREFIXES);
  const metricMol = getMetricPrefix(material, 2, METRIC_PREFIXES);

  return (
    <div className="d-flex gap-2 align-items-start">
      <div className="flex-grow-1 text-end pt-1">Adjusted:</div>
      <div className="reaction-material__amount-input">
        <NumeralInputWithUnitsCompo
          className="reaction-material__mass-input"
          value={material.adjusted_amount_g}
          unit="g"
          metricPrefix={metric}
          metricPrefixes={METRIC_PREFIXES}
          precision={5}
          disabled
          readOnly
          size="sm"
        />
        {renderMaterialVolume()}
        <NumeralInputWithUnitsCompo
          className="reaction-material__molarity-input"
          value={material.adjusted_amount_mol}
          unit="mol"
          metricPrefix={metricMol}
          metricPrefixes={METRIC_PREFIXES_MOL}
          precision={4}
          disabled
          readOnly
          size="sm"
        />
      </div>
      <NumeralInputWithUnitsCompo
        className="reaction-material__concentration-input"
        value={material.adjusted_loading}
        unit="mmol/g"
        metricPrefix="n"
        metricPrefixes={['n']}
        precision={3}
        disabled
        readOnly
        size="sm"
      />
      <Form.Control
        className="reaction-material__equivalent-input"
        type="text"
        value={`${((material.adjusted_equivalent || 0) * 100).toFixed(1)} %`}
        disabled
        size="sm"
      />
      <div className="reaction-material__delete-input" />
    </div>
  );
}

MaterialCalculations.propTypes = {
  material: PropTypes.shape({
    contains_residues: PropTypes.bool,
    metrics: PropTypes.arrayOf(PropTypes.string),
    amount_ml: PropTypes.number,
    adjusted_amount_g: PropTypes.number,
    adjusted_amount_mol: PropTypes.number,
    adjusted_loading: PropTypes.number,
    adjusted_equivalent: PropTypes.number,
  }).isRequired,
};

export default MaterialCalculations;
