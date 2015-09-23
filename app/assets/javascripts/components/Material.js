import React, {Component, PropTypes} from 'react';
import {Input, Button} from 'react-bootstrap';
import NumeralInputWithUnits from './NumeralInputWithUnits'

export default class Material extends Component {
  handleReferenceChange(event, sampleId) {
    let value = event.target.value;
    this.props.onChange(
      {
        type: 'referenceChanged',
        materialGroup: this.state.materialGroup,
        sampleID: sampleId,
        value: value
      }
    )
  }

  handleDelete() {
    const {deleteMaterial, material} = this.props;
    deleteMaterial(material);
  }

  handleAmountChange(amount){

  }

  handleUnitChange(unit, nextUnit, value) {

  }

  render() {
    const {material, style} = this.props;
    const sample = material;
    if (Object.keys(sample).length == 0) {
      return <tr style={style}>
        <td colSpan="6"></td>
      </tr>
    } else {
      return <tr style={style}>
        <td>
          <input
            type="radio"
            name="reference"
            onClick={event => this.handleReferenceChange(event, sample.id)}
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
            convertValueFromUnitToNextUnit={(unit, nextUnit, value) => this.handleUnitChange(unit, nextUnit, value)}
            onChange={(amount) => this.handleAmountChange(amount)}
            />
        </td>
        <td>
          <Input
            type="text"
            value={sample.equivalent} disabled/>
        </td>
        <td>
          <Button
            bsSize="small"
            bsStyle="danger"
            onClick={() => this.handleDelete()}
            >
            <i className="fa fa-trash-o"></i>
          </Button>
        </td>
      </tr>
    }
  }
}

Material.propTypes = {
  material: PropTypes.object.isRequired
};
