import React, {Component, PropTypes} from 'react';
import {Radio,FormControl, Button} from 'react-bootstrap';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
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

export default class Material extends Component {
  handleMaterialClick(sample) {
    const uiState = UiStore.getState();
    let currentURI = Aviator.getCurrentURI();
    Aviator.navigate(`${currentURI}/sample/${sample.id}`);
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
            value={material.amount_l}
            unit='l'
            metricPrefix='milli'
            metricPrefixes = {['milli','none','micro']}
            precision={3}
            onChange={(amount) => this.handleAmountChange(amount)}
          />
        </td>
      )
  }

  materialLoading(material, inputsStyle, showLoadingColumn) {
    if(!showLoadingColumn) {
      return false;
    } else if (!material.contains_residues)
      return this.notApplicableInput(inputsStyle);
    else {
      let disabled = this.props.materialGroup == 'products';
      return(
        <td style={inputsStyle}>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.loading}
            unit='mmol/g'
            metricPrefix='none'
            metricPrefixes={['none']}
            bsStyle={material.error_loading ? 'error' : 'success'}
            precision={3}
            disabled={disabled}
            onChange={(loading) => this.handleLoadingChange(loading)}
          />
        </td>
      )
    }
  }

  render() {
    const {material, deleteMaterial, isDragging, connectDragSource,
           showLoadingColumn } = this.props;

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

    if(this.props.materialGroup == 'products')
      material.amountType = 'real';//always take real amount for product

    return <tr style={style}>
      {connectDragSource(
        <td style={handleStyle}>
          <span className='text-info fa fa-arrows'></span>
        </td>,
        {dropEffect: 'copy'}
      )}
      <td>
        <Radio
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
        <Radio
          name={`amount_type_${material.id}`}
          checked={material.amountType === 'target'}
          onChange={event => this.handleAmountTypeChange('target')}
          disabled={this.props.materialGroup == 'products'}
        />
        <Radio
          name={`amount_type_${material.id}`}
          checked={material.amountType === 'real'}
          onChange={event => this.handleAmountTypeChange('real')}
        />
      </td>

      <td style={inputsStyle}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.amount_g}
          unit='g'
          metricPrefix='milli'
          metricPrefixes = {['milli','none','micro']}
          precision={5}
          onChange={(amount) => this.handleAmountChange(amount)}
          bsStyle={material.error_mass ? 'error' : 'success'}
        />
      </td>

      {this.materialVolume(material, inputsStyle)}

      <td style={inputsStyle}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.amount_mol}
          unit='mol'
          metricPrefix='milli'
          metricPrefixes = {['milli','none']}
          precision={4}
          disabled={this.props.materialGroup == 'products'}
          onChange={(amount) => this.handleAmountChange(amount)}
        />
      </td>

      {this.materialLoading(material, inputsStyle, showLoadingColumn)}

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
        <FormControl type="text"
          value={`${((material.equivalent || 0 ) * 100).toFixed(1)} %`}
          disabled={true}
        />
      );
    } else {
      return (
        <FormControl type="text"
          value={material.equivalent}
          disabled={material.reference && material.equivalent}
          onChange={(e) => this.handleEquivalentChange(e)}
        />
      );
    }
  }

  handleReferenceChange(event) {
    let value = event.target.value;

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

  handleLoadingChange(newLoading) {
    this.props.material.residues[0].custom_info.loading = newLoading.value;

    // just recalculate value in mg using the new loading value
    if(this.props.onChange) {
      let event = {
        type: 'amountChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        amount: this.props.material.amount
      };
      this.props.onChange(event);
    }
  }

  handleUnitChange(unit, nextUnit, value) {

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
