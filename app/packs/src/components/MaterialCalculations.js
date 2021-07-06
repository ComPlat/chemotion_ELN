import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import { FormControl } from 'react-bootstrap';

import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';

const source = {
  beginDrag(props) {
    return props;
  }
};

const collect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

export default class MaterialCalculations extends Component {

  notApplicableInput(inputsStyle) {
    return (
      <td style={inputsStyle}>
        <FormControl type="text"
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
      return(
        <td style={inputsStyle}>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.amount_ml || ''}
            unit='l'
            metricPrefix={metric}
            metricPrefixes = {metricPrefixes}
            onChange={(amount) => this.handleAmountChange(amount)}
          />
        </td>
      )
  }

  render() {
    const {material, deleteMaterial, isDragging, connectDragSource} = this.props;

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';

      const metricPrefixesMol = ['m', 'n'];
      const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';

    const inputsStyle = {
      paddingTop: 15,
      paddingRight: 2,
      paddingLeft: 2,
    };

    return <tr>
      <td style={inputsStyle}></td>
      <td style={inputsStyle}></td>
      <td style={inputsStyle}></td>
      <td style={inputsStyle}><label>Adjusted: </label></td>
      <td style={inputsStyle}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.adjusted_amount_g}
          unit='g'
          metricPrefix={metric}
          metricPrefixes = {metricPrefixes}
          precision={5}
          disabled
          readOnly
        />
      </td>

      {this.materialVolume(material, inputsStyle)}

      <td style={inputsStyle}>
        <NumeralInputWithUnitsCompo
          key={'adjusted_amount_mol' + material.id.toString()}
          value={material.adjusted_amount_mol}
          unit='mol'
          metricPrefix={metricMol}
          metricPrefixes = {metricPrefixesMol}
          precision={4}
          disabled
          readOnly
        />
      </td>

      <td style={inputsStyle}>
        <NumeralInputWithUnitsCompo
          key={'adjusted_loading' + material.id.toString()}
          value={material.adjusted_loading}
          unit='mmol/g'
          metricPrefix='n'
          metricPrefixes = {['n']}
          precision={3}
          disabled
          readOnly
        />
      </td>

      <td style={inputsStyle}>
        <FormControl
          type="text"
          value={`${((material.adjusted_equivalent || 0 ) * 100).toFixed(1)} %`}
          disabled
        />
      </td>
      <td></td>
    </tr>
  }
}
