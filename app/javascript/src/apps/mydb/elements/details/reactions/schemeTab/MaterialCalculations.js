import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

export default class MaterialCalculations extends Component {
  materialVolume() {
    const { material } = this.props;
    if (material.contains_residues) {
      return <Form.Control type="text" value="N / A" disabled />;
    }

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (
      material.metrics
      && material.metrics.length > 2
      && metricPrefixes.includes(material.metrics[1])
    ) ? material.metrics[1]
      : 'm';

    return (
      <NumeralInputWithUnitsCompo
        value={material.amount_ml || ''}
        unit="l"
        metricPrefix={metric}
        metricPrefixes={metricPrefixes}
        precision={5}
        disabled
        readOnly
      />
    );
  }

  render() {
    const { material } = this.props;

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (
      material.metrics
      && material.metrics.length > 2
      && metricPrefixes.includes(material.metrics[0])
    ) ? material.metrics[0]
      : 'm';

    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (
      material.metrics
      && material.metrics.length > 2
      && metricPrefixes.includes(material.metrics[2])
    ) ? material.metrics[2]
      : 'm';

    return (
      <tr>
        <td colSpan="4" />
        <td className="pt-4 px-1">Adjusted:</td>
        <td className="pt-4 px-1">
          <NumeralInputWithUnitsCompo
            value={material.adjusted_amount_g}
            unit="g"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={5}
            disabled
            readOnly
          />
        </td>

        <td className="pt-4 px-1">
          {this.materialVolume()}
        </td>

        <td className="pt-4 px-1">
          <NumeralInputWithUnitsCompo
            value={material.adjusted_amount_mol}
            unit="mol"
            metricPrefix={metricMol}
            metricPrefixes={metricPrefixesMol}
            precision={4}
            disabled
            readOnly
          />
        </td>

        <td className="pt-4 px-1">
          <NumeralInputWithUnitsCompo
            value={material.adjusted_loading}
            unit="mmol/g"
            metricPrefix="n"
            metricPrefixes={['n']}
            precision={3}
            disabled
            readOnly
          />
        </td>

        <td className="pt-4 px-1">
          <Form.Control
            type="text"
            value={`${((material.adjusted_equivalent || 0) * 100).toFixed(1)} %`}
            disabled
          />
        </td>

        <td />
      </tr>
    );
  }
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
