import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';

import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';


export default class MaterialCalculations extends Component {

  notApplicableInput() {
    return (
      <td className='pt-4 px-1'>
        <Form.Control type="text"
          value="N / A"
          disabled={true}
        />
      </td>
    )
  }

  materialVolume(material, inputsStyle) {

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1) ? material.metrics[1] : 'm';

    if (material.contains_residues)
      return this.notApplicableInput(inputsStyle);
    else
      return (
        <td className='pt-4 px-1'>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.amount_ml || ''}
            unit='l'
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={5}
            disabled
            readOnly
          />
        </td>
      )
  }

  render() {
    const { material, deleteMaterial, isDragging, connectDragSource } = this.props;

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';

    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';

    const inputsStyle = {
      paddingTop: 15,
      paddingRight: 2,
      paddingLeft: 2,
    };

    return (
      <tr>
        <td className="pt-4 px-1" />
        <td className="pt-4 px-1" />
        <td className="pt-4 px-1" />
        <td className="pt-4 px-1"><label>Adjusted: </label></td>
        <td className="pt-4 px-1">
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.adjusted_amount_g}
            unit='g'
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={5}
            disabled
            readOnly
          />
        </td>

        {this.materialVolume(material, inputsStyle)}

        <td className="pt-4 px-1">
          <NumeralInputWithUnitsCompo
            key={'adjusted_amount_mol' + material.id.toString()}
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
            key={'adjusted_loading' + material.id.toString()}
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
