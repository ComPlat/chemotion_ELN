import React from 'react';
import {Button, Checkbox, FormGroup, FormControl, InputGroup, ControlLabel, Glyphicon, Row, Col} from 'react-bootstrap';

import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import Select from 'react-select';

import {solventOptions} from './staticDropdownOptions/options';




export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sample: props.sample
    }
  }

  handleAmountChanged(amount) {
    let sample = this.state.sample;
    sample.setAmountAndNormalizeToGram(amount);
    this.setState({
      sample: sample
    });
  }

  handleUnitChanged(unit, nextUnit, value) {
    let convertedValue = value;
    if(unit && nextUnit && unit != nextUnit) {
      switch(unit) {
        case 'g':
          if(nextUnit == 'mol') {
            convertedValue = value * 2;
          }
          break;
        case 'mol':
          if(nextUnit == 'g') {
            convertedValue = value / 2;
          }
          break;
      }
    }
    return convertedValue;
  }

  showStructureEditor() {
    this.props.parent.setState({
      showStructureEditor: true
    })
  }

  structureEditorButton(isDisabled) {
    return (
      <Button onClick={this.showStructureEditor.bind(this)} disabled={isDisabled}>
        <Glyphicon glyph='pencil'/>
      </Button>
    )
  }

  // Input components of sample details should be disabled if detail level does not allow to read their content
  topSecretCheckbox(sample) {
    if(!sample.isMethodDisabled('is_top_secret')) {
      return (
        <Checkbox ref="topSecretInput"
        checked={sample.is_top_secret}
        onChange={(e) => this.handleFieldChanged(sample, 'is_top_secret', e.target.checked)}
        >Top secret</Checkbox>
      )
    }
  }

  moleculeInput(sample) {
    return (
      <FormGroup>
        <ControlLabel>Molecule</ControlLabel>
        <InputGroup>
          <FormControl type="text" ref="moleculeInput"
            value={sample.molecule && (sample.molecule.iupac_name || sample.molecule.sum_formular || '')}
            disabled={sample.isMethodDisabled('molecule_iupac_name')}
            readOnly={sample.isMethodDisabled('molecule_iupac_name')}
            onChange={(e) => this.handleFieldChanged(sample, 'molecule_iupac_name', e.target.value)}
          />
          <InputGroup.Button>
            {this.structureEditorButton(sample.isMethodDisabled('molecule_iupac_name'))}
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    )
  }

  handleFieldChanged(sample, field, e) {
    if(/amount/.test(field))
      this.handleAmountChanged(e);
    else if (e && e.value) // for numeric inputs
      sample[field] = e.value;
    else
      sample[field] = e;

    this.props.parent.setState({
      sample: sample
    });
  }

  textInput(sample, field, label, disabled = false) {
    return (
      <FormGroup>
        <ControlLabel>{label}</ControlLabel>
        <FormControl type="text"
          value={sample[field] || ''}
          onChange={(e) => {this.handleFieldChanged(sample, field, e.target.value)}}
          disabled={disabled || sample.isMethodDisabled(field)}
          readOnly={disabled || sample.isMethodDisabled(field)}
        />
      </FormGroup>
    )
  }

  sampleSolvent(sample) {
    return (
      <Select ref='solventInput'
              name='solvents'
              multi={false}
              options={solventOptions}
              onChange={(e) => this.handleFieldChanged(sample, 'solvent', e)}
              value={sample.solvent}
              disabled={sample.isMethodDisabled('solvent')}
      />
    )
  }

  attachedAmountInput(sample, size) {
    if(!sample.contains_residues)
      return false;

    return this.numInput(sample, 'defined_part_amount', 'g',
    ['milli','none'], 4, 'Attached', 'attachedAmountMg', true, "Weight of the defined part", size)
  }

  numInput(sample, field, unit, prefixes, precision, label, ref = '', disabled = false, title='', size=2) {
    if(sample.contains_residues && unit == 'l')
      return false;

    return (
      <Col md={size} key={field + sample.id.toString()}>
        <NumeralInputWithUnitsCompo
          value={!isNaN(sample[field]) ? sample[field] : null}
          unit={unit}
          label={label}
          ref={ref}
          metricPrefix={prefixes[0]}
          metricPrefixes = {prefixes}
          precision={precision}
          title={title}
          disabled={disabled}
          onChange={(e) => this.handleFieldChanged(sample, field, e)}
          />
      </Col>
    )
  }

  sampleAmount(sample, inputsSize=2) {
    let content = [];
    if(sample.isMethodDisabled('amount_value') == false) {
      if(sample.isMethodRestricted('molecule') == true) {
        content.push(
          this.numInput(sample, 'amount_g', 'g',['milli','none'], 4, 'Amount', 'massMgInput', false, '', inputsSize)
        )
      } else {
        content.push(
          this.numInput(sample, 'amount_g', 'g',['milli','none'], 4, 'Amount', 'massMgInput', false, '', inputsSize)
        )

        if(!sample.contains_residues)
          content.push(
            this.numInput(sample, 'amount_l', 'l', ['milli','micro','none'], 5, '\u202F', 'l', false, '', inputsSize)
          )

        content.push(
          this.numInput(sample, 'amount_mol', 'mol', ['milli','none'], 4, '\u202F', 'amountInput', false, '', inputsSize)
        )

        if(sample.contains_residues)
          content.push(
            this.attachedAmountInput(sample, inputsSize)
          )
      }
     return content;
    } else {
      return (
        <FormGroup>
          <ControlLabel>Amount</ControlLabel>
          <FormControl type="text" disabled defaultValue="***" readOnly/>
        </FormGroup>
      )
    }
  }

  sampleDescription(sample) {
    return (
      <FormGroup>
        <ControlLabel>Description</ControlLabel>
        <FormControl componentClass="textarea"  ref="descriptionInput"
             placeholder={sample.description}
             value={sample.description || ''}
             onChange={(e) => this.handleFieldChanged(sample, 'description', e.target.value)}
             rows={2}
             disabled={sample.isMethodDisabled('description')}
        />
      </FormGroup>
    )
  }

  render() {
    let sample = this.state.sample || {}
    let isPolymer = sample.molfile.indexOf(" R# ") !== -1

    return (
      <div className="sample-form">
        <Row>
          <Col md={6}>{this.moleculeInput(sample)}</Col>
          <Col md={6} className="top-secret-checkbox">
            {this.topSecretCheckbox(sample)}
          </Col>
        </Row>

        <Row>
          <Col md={4}>{this.textInput(sample, 'name', 'Name')}</Col>
          <Col md={4}>
            {this.textInput(sample, 'external_label', 'External label')}
          </Col>
          <Col md={4}>{this.textInput(sample, 'location', 'Location')}</Col>
        </Row>

        <Row className="visible-hd">
          {this.sampleAmount(sample)}
          {this.numInput(sample, 'density', 'g/ml', ['none'], 5, 'Density', '', isPolymer)}
          {this.numInput(sample, 'boiling_point', '°C', ['none'], 5, 'Boiling point')}
          {this.numInput(sample, 'melting_point', '°C', ['none'], 5, 'Melting point', '', isPolymer)}
        </Row>

        <Row className="hidden-hd">
          {this.sampleAmount(sample, 4)}
        </Row>
        <Row className="hidden-hd">
          {this.numInput(sample, 'density', 'g/ml', ['none'], 5, 'Density', '', isPolymer, '', 4)}
          {this.numInput(sample, 'boiling_point', '°C', ['none'], 5, 'Boiling point', '', false, '', 4)}
          {this.numInput(sample, 'melting_point', '°C', ['none'], 5, 'Melting point', '', isPolymer, '', 4)}
        </Row>

        <Row>
          <Col md={4}>{this.sampleDescription(sample)}</Col>
          {this.numInput(sample, 'purity', 'none', ['none'], 5, 'Purity')}
          <Col md={2}>{this.textInput(sample, 'impurities', 'Impurities')}</Col>
          <Col md={4}>
            <label>Solvent</label>
            {this.sampleSolvent(sample)}
          </Col>
        </Row>
      </div>
    )
  }
}
