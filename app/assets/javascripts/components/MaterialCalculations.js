import React, {Component, PropTypes} from 'react';
import {FormControl, Button} from 'react-bootstrap';
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
    if (material.contains_residues)
      return this.notApplicableInput(inputsStyle);
    else
      return(
        <td style={inputsStyle}>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.amount_ml}
            unit='l'
            metricPrefix='milli'
            metricPrefixes = {['milli','none','micro']}
            onChange={(amount) => this.handleAmountChange(amount)}
          />
        </td>
      )
  }

  render() {
    const {material, deleteMaterial, isDragging, connectDragSource} = this.props;

    const inputsStyle = {
      paddingTop: 15,
      paddingRight: 5
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
          metricPrefix='milli'
          metricPrefixes = {['milli','none','micro']}
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
          metricPrefix='milli'
          metricPrefixes = {['milli','none']}
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
          metricPrefix='none'
          metricPrefixes = {['none']}
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
