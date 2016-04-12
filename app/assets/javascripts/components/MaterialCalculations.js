import React, {Component, PropTypes} from 'react';
import {Input, Button} from 'react-bootstrap';
import NumeralInputWithUnits from './NumeralInputWithUnits';

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
        <Input type="text"
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
          <NumeralInputWithUnits
            key={material.id}
            value={material.amount_ml}
            unit='ml'
            numeralFormat='0,0.0000'
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
        <NumeralInputWithUnits
          key={material.id}
          value={material.adjusted_amount_mg}
          unit='mg'
          disabled
          numeralFormat='0,0.0000'
        />
      </td>

      {this.materialVolume(material, inputsStyle)}

      <td style={inputsStyle}>
        <NumeralInputWithUnits
          key={material.id}
          value={material.adjusted_amount_mmol}
          unit='mmol'
          disabled
          numeralFormat='0,0.0000'
        />
      </td>

      <td style={inputsStyle}>
        <NumeralInputWithUnits
          key={material.id}
          value={material.adjusted_loading}
          unit='mmol/g'
          numeralFormat='0,0.0000'
          disabled
        />
      </td>

      <td style={inputsStyle}>
        <Input
          type="text"
          value={`${((material.adjusted_equivalent || 0 ) * 100).toFixed(1)} %`}
          disabled
        />
      </td>
      <td></td>
    </tr>
  }
}
