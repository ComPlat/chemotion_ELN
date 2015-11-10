import React, {Component, PropTypes} from 'react';
import {Input, Button} from 'react-bootstrap';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import NumeralInputWithUnits from './NumeralInputWithUnits';
import UiStore from './stores/UIStore';

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
  handleMaterialClick(sample) {
    const uiState = UiStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}/sample/${sample.id}`);
  }

  materialName() {
    const {material} = this.props;
    if(!material.isNew) {
      return (
        <a onClick={() => this.handleMaterialClick(material)} style={{cursor: 'pointer'}}>
          {material.title()}
        </a>
      );
    } else {
      return material.title();
    }
  }

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
    const inputsStyle = {
      paddingTop: 15,
      paddingRight: 5
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
          checked={material.reference}
          onChange={event => this.handleReferenceChange(event)}
        />
      </td>
      <td>
        {this.materialName()}<br/>
        {material.molecule.iupac_name}
      </td>
      <td>
        <input
          type="radio"
          name={`amount_type_${material.id}`}
          checked={material.amountType === 'target'}
          onChange={event => this.handleAmountTypeChange('target')}
        />
        <input
          type="radio"
          name={`amount_type_${material.id}`}
          checked={material.amountType === 'real'}
          onChange={event => this.handleAmountTypeChange('real')}
        />
      </td>

      <td style={inputsStyle}>
        <NumeralInputWithUnits
          key={material.id}
          value={material.amount_mg}
          unit='mg'
          numeralFormat='0,0.0000'
          onChange={(amount) => this.handleAmountChange(amount)}
        />
      </td>

      <td style={inputsStyle}>
        <NumeralInputWithUnits
          key={material.id}
          value={material.amount_ml}
          unit='ml'
          numeralFormat='0,0.0000'
          onChange={(amount) => this.handleAmountChange(amount)}
        />
      </td>

      <td style={inputsStyle}>
        <NumeralInputWithUnits
          key={material.id}
          value={material.amount_mmol}
          unit='mmol'
          numeralFormat='0,0.0000'
          onChange={(amount) => this.handleAmountChange(amount)}
        />
      </td>

      <td style={inputsStyle}>
        {this.equivalentOrYield(material)}
      </td>
      <td>
        <Button
          bsStyle="danger"
          onClick={() => deleteMaterial(material)} >
          <i className="fa fa-trash-o"></i>
        </Button>
      </td>
    </tr>
  }

  equivalentOrYield(material) {
    if(this.props.materialGroup == 'products') {
      return (
        <Input
          type="text"
          value={`${((material.equivalent || 0 ) * 100).toFixed(1)} %`}
          disabled={true}
        />
      );
    } else {
      return (
        <Input
          type="text"
          value={material.equivalent}
          disabled={material.reference && material.equivalent}
          onChange={(e) => this.handleEquivalentChange(e)}
        />
      );
    }
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

  handleAmountTypeChange(amountType) {
    console.log("amountType: "  + amountType);

    if(this.props.onChange) {
      let event = {
        type: 'amountTypeChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        amountType: amountType
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
