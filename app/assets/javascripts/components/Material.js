import React, {Component} from 'react';
import NumeralInputWithUnits from './NumeralInputWithUnits'
import {Input} from 'react-bootstrap';

export default class Material extends Component {
  constructor(props) {
    super(props);
  }

  handleReferenceChange(event, sampleID) {
    let value = event.target.value;
    this.props.onChange(
      {
        type: 'referenceChanged',
        materialGroup: this.state.materialGroup,
        sampleID: sampleID,
        value: value
      }
    )
  }

  render() {
    const {material, style} = this.props;
    const {sample} = material;
    if (! sample) {
      return (
        <tr style={style}>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      );
    } else {
      return (
        <tr style={style}>
          <td>
            <input
              type="radio"
              name="reference"
              onClick={(e) => this.handleReferenceChange(e, sample.id)}
              />
          </td>
          <td>{sample.name}</td>
          <td>{sample.molecule.sum_formular}</td>
          <td>
            <NumeralInputWithUnits
              value={sample.amount_value}
              unit={sample.amount_unit || 'g'}
              units={['g', 'ml', 'mol']}
              numeralFormat='0,0.00'
              convertValueFromUnitToNextUnit={(unit, nextUnit, value) => this.handleUnitChanged(unit, nextUnit, value)}
              onChange={(amount) => this.handleAmountChanged(amount)}
              />
          </td>
          <td>
            <Input
              type="text"
              value={sample.equivalent} disabled/>
          </td>
        </tr>
      );
    }
  }
}
