import React, {Component, PropTypes} from 'react';
import {Radio,FormControl, Button, InputGroup, OverlayTrigger, Tooltip} from 'react-bootstrap';
import {DragSource} from 'react-dnd';
import DragDropItemTypes from './DragDropItemTypes';
import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import NumInputWithUnitsTypesCompo from './NumInputWithUnitsTypesCompo';
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
    let currentURI = Aviator.getCurrentURI();
    Aviator.navigate(`${currentURI}/sample/${sample.id}`);
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

    let style = {padding: "0"};
    if (isDragging) {
      style.opacity = 0.3;
    }
    let handleStyle = {
      cursor: 'move',
      lineHeight: 2,
      verticalAlign: 'middle'
    };
    const inputsStyle = {
      padding: "0px 2px 0px 2px",
      margin: "0px"
    };

    if(this.props.materialGroup == 'products')
      material.amountType = 'real';//always take real amount for product

    return (
      this.props.materialGroup !== 'solvents'
        ? this.generalMaterial(this.props, style, handleStyle, inputsStyle)
        : this.solventMaterial(this.props, style, handleStyle, inputsStyle)
    )
  }

  equivalentOrYield(material) {
    if(this.props.materialGroup == 'products') {
      return (
        <FormControl type="text"
          value={`${((material.equivalent || 0 ) * 100).toFixed(0)} %`}
          disabled={true}
        />
      );
    } else {
      return (
        <NumeralInputWithUnitsCompo
          precision={4}
          value={material.equivalent}
          disabled={(material.reference && material.equivalent) !== false}
          onChange={(e) => this.handleEquivalentChange(e)}
        />
      );
    }
  }

  handleExternalLabelChange(event) {
    let value = event.target.value;

    if(this.props.onChange) {
       let event = {
         type: 'externalLabelChanged',
         materialGroup: this.props.materialGroup,
         sampleID: this.materialId(),
         externalLabel: value
       };
       this.props.onChange(event);
    }
  }

  handleExternalLabelCompleted() {
    if(this.props.onChange) {
       let event = {
         type: 'externalLabelCompleted'
       };
       this.props.onChange(event);
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

  handleAmountUnitChange(amount) {
    if(this.props.onChange) {
      let event = {
        type: 'amountUnitChanged',
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

  handleEquivalentChange(e) {
    let equivalent = e.value;

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

  generalMaterial(props, style, handleStyle, inputsStyle) {
    const {material, deleteMaterial, isDragging, connectDragSource,
           showLoadingColumn, totalVolume } = props;
    const isTarget = material.amountType === 'target'

    const mol = material.amount_mol;
    const concentration = isNaN(mol / totalVolume) ? 0.0 : mol / totalVolume;

    return (
      <tr style={style}>
        {connectDragSource(
          <td style={handleStyle}>
            <span className='text-info fa fa-arrows'></span>
          </td>,
          {dropEffect: 'copy'}
        )}

        <td style={inputsStyle} style={{width: "25%", maxWidth: "50px"}}>
          {this.materialNameWithIupac(material)}
        </td>
        <td style={inputsStyle}>
          <Radio
            name="reference"
            checked={material.reference}
            onChange={event => this.handleReferenceChange(event)}
            bsSize="xsmall"
            style={{margin: 0}}
          />
        </td>
        <td style={inputsStyle} >
          {this.switchTargetReal(isTarget)}
        </td>

        <td style={inputsStyle}>
          <NumInputWithUnitsTypesCompo
            key={material.id}
            material={material}
            metricPrefix='milli'
            metricPrefixes = {['milli','none','micro']}
            precision={5}
            unitTypeSwitch={true}
            unitTypes={['g', 'l']}
            onChange={(amount) => this.handleAmountUnitChange(amount)}
          />
        </td>

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

        <td style={inputsStyle}>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={concentration}
            unit='mol/l'
            metricPrefix='milli'
            metricPrefixes = {['milli','none']}
            precision={4}
            disabled={true}
          />
        </td>

        {this.materialLoading(material, inputsStyle, showLoadingColumn)}

        <td style={inputsStyle}>
          {this.equivalentOrYield(material)}
        </td>
        <td style={inputsStyle}>
          <Button
            bsStyle="danger"
            bsSize="small"
            onClick={() => deleteMaterial(material)} >
            <i className="fa fa-trash-o"></i>
          </Button>
        </td>
      </tr>
    )
  }

  toggleTarget(isTarget) {
    this.handleAmountTypeChange(!isTarget ? 'target' : 'real')
  }

  solventMaterial(props, style, handleStyle, inputsStyle) {
    const {material, deleteMaterial, isDragging, connectDragSource,
           showLoadingColumn } = props;
    const isTarget = material.amountType === 'target'

    return (
      <tr style={style}>
        {connectDragSource(
          <td style={handleStyle}>
            <span className='text-info fa fa-arrows'></span>
          </td>,
          {dropEffect: 'copy'}
        )}

        <td style={inputsStyle} style={{width: "25%", maxWidth: "50px"}}>
          {this.materialNameWithIupac(material)}
        </td>
        <td>
          {this.switchTargetReal(isTarget)}
        </td>

        <td style={inputsStyle}>
          <InputGroup>
            <FormControl
              type="text"
              value={material.external_label}
              placeholder={material.molecule.iupac_name}
              onChange={event => this.handleExternalLabelChange(event)} />
            <InputGroup.Button>
              <OverlayTrigger placement="bottom" overlay={this.refreshSvgTooltip()}>
                <Button active style={ {padding: '6px'}} onClick={e => this.handleExternalLabelCompleted()} >
                  <i className="fa fa-refresh"></i>
                </Button>
              </OverlayTrigger>
            </InputGroup.Button>
          </InputGroup>
        </td>

        {this.materialVolume(material, inputsStyle)}

        <td style={inputsStyle}>
          <FormControl type="text"
            value={`${this.solvConcentration(material, props.solventsVolSum)} %`}
            disabled={true}
          />
        </td>

        <td>
          <Button
            bsStyle="danger"
            bsSize="small"
            onClick={() => deleteMaterial(material)} >
            <i className="fa fa-trash-o"></i>
          </Button>
        </td>
      </tr>
    )
  }

  switchTargetReal(isTarget, style={padding: "6px 4px"}) {
    return (
      <Button active
              style= {style}
              onClick={() => this.toggleTarget(isTarget)}
              bsStyle={isTarget ? 'success' : 'primary'}
              bsSize='small'
              >
        {isTarget ? "T" : "R"}
      </Button>
    )
  }

  materialNameWithIupac(material) {
    // Skip shortLabel for reactants and solvents
    let skipShortLabel = this.props.materialGroup == 'reactants' ||
                         this.props.materialGroup == 'solvents'
    let materialName = ""
    let moleculeIupacName = ""
    var idCheck = /^\d+$/

    if (skipShortLabel) {
      if (idCheck.test(material.id)) {
        materialName =
          <a onClick={() => this.handleMaterialClick(material)}
             style={{cursor: 'pointer'}}>
            {material.molecule_iupac_name}
          </a>
      } else {
        materialName =
          <span>{material.molecule_iupac_name}</span>
      }
    } else {
      moleculeIupacName = material.molecule_iupac_name
      materialName =
        <a onClick={() => this.handleMaterialClick(material)} style={{cursor: 'pointer'}}>
          {material.title()}
        </a>
      if (material.isNew)
        materialName = material.title()
    }

    return (
      <OverlayTrigger placement="bottom" overlay={this.iupacNameTooltip(material.molecule.iupac_name)}>
        <div style={{display: "inline-block", maxWidth: "100%"}}>
          {materialName}
          <br/>
          <span style={{display: "block", whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis", maxWidth: "100%"}}>
            {moleculeIupacName}
          </span>
        </div>
      </OverlayTrigger>
    )
  }

  solvConcentration(material, solventsVolSum) {
    if(material.amountType === 'real') {
      return (material.real_amount_value / solventsVolSum * 100).toFixed(1)
    } else {
      return (material.target_amount_value / solventsVolSum * 100).toFixed(1)
    }
  }

  refreshSvgTooltip() {
    return(
      <Tooltip id="refresh_svg_tooltip">Refresh reaction diagram</Tooltip>
    )
  }

  iupacNameTooltip(iupacName) {
    return(
      <Tooltip id="iupac_name_tooltip">{iupacName}</Tooltip>
    )
  }
}

export default DragSource(DragDropItemTypes.MATERIAL, source, collect)(Material);

Material.propTypes = {
  material: PropTypes.object.isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.object,
  solventsVolSum: PropTypes.number.isRequired,
  totalVolume: PropTypes.number.isRequired,
};
