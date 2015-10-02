import React, {Component, PropTypes} from 'react';
import {Input, Button} from 'react-bootstrap';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
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

class Material extends Component {

  render() {
    const {material, deleteMaterial, isDragging, connectDragSource} = this.props;

    let style = {};
    if (isDragging) {
      style.opacity = 0.3;
    }
    let handleStyle = {
      cursor: 'move',
      lineHeight: 2,
      verticalAlign: 'middle'
    };
    return <tr style={style}>
      {connectDragSource(
        <td style={handleStyle}>
          <span className='text-info fa fa-arrows'></span>
        </td>,
        {dropEffect: 'copy'}
      )}
      <td>
        <input
          type="radio"
          name="reference"
          onClick={event => this.handleReferenceChange(event)}
        />
      </td>
      <td>{material.name}</td>
      <td>{material.molecule.sum_formular}</td>
      <td className="padding-right">
        <NumeralInputWithUnits
          key={material.id}
          value={material.amount_value}
          unit={material.amount_unit || 'mg'}
          units={['mg', 'ml', 'mmol']}
          numeralFormat='0,0.00'
          convertValueFromUnitToNextUnit={(unit, nextUnit, value) => this.handleUnitChange(unit, nextUnit, value)}
          onChange={(amount) => this.handleAmountChange(amount)}
        />
      </td>
      <td className="padding-right">
        <Input
          type="text"
          value={material.equivalent}
          disabled={material.reference}
          onChange={(e) => this.handleEquivalentChange(e)}
        />
      </td>
      <td style={{verticalAlign: 'top'}}>
        <Button
          bsStyle="danger"
          onClick={() => deleteMaterial(material)} >
          <i className="fa fa-trash-o"></i>
        </Button>
      </td>
    </tr>
  }

  handleReferenceChange(event) {
    let value = event.target.value;
    console.log("Material " + this.materialId() + " handleReferenceChange value:" + value)

    if(this.props.onChange) {
       let event = {
         type: 'referenceChanged',
         materialGroup: this.props.materialGroup,
         sampleID: this.materialId(),
         value: value
       };
       this.props.onChange(event);
    }
  }

  handleAmountChange(amount) {
    console.log("Material " + this.materialId() + " handleAmountChange amount:" + JSON.stringify(amount))

    if(this.props.onChange) {
      let event = {
        type: 'amountChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        amount: amount
      };
      this.props.onChange(event);
    }
  }

  handleUnitChange(unit, nextUnit, value) {
    console.log("Material " + this.materialId() + " handleUnitChange unit: " + unit + "->" + nextUnit + " value:" + value)

    if(this.props.onChange) {
      let event = {
        type: 'unitChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        unitChange: {
          unit: unit,
          nextUnit: nextUnit,
          value: value
        }
      };
      this.props.onChange(event);
    }

    //TODO: currently returns the convertedValue, but we should set it from outside
    return value
  }

  handleEquivalentChange(event) {
    let equivalent = event.target.value;
    console.log("Material " + this.materialId() + " handleEquivalentChange amount:" + equivalent)

    if(this.props.onChange) {
      let event = {
        type: 'equivalentChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        equivalent: equivalent
      };
      this.props.onChange(event);
    }
  }

  materialId() {
    return this.material().id
  }

  material() {
    return this.props.material
  }
}

export default DragSource(DragDropItemTypes.MATERIAL, source, collect)(Material);

Material.propTypes = {
  material: PropTypes.object.isRequired,
  deleteMaterial: PropTypes.func.isRequired
};
