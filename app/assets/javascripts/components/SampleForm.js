import React from 'react';
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal,
        Accordion, Panel, ListGroup, ListGroupItem, Glyphicon, Tabs, Tab,
        Row, Col} from 'react-bootstrap';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import extra from "./extra/SampleDetailsExtra"
import Select from 'react-select';

import {solventOptions} from './staticDropdownOptions/options';
import Sample from './models/Sample';

const MWPrecision = 6;

export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sample: props.sample
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    if(!state.currentElement || state.currentElement.type == 'sample') {
      this.setState({
        sample: state.currentElement,
        reaction: state.currentReaction,
        materialGroup: state.currentMaterialGroup,
        loadingMolecule: false
      });
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

  updateMolecule(molfile, svg_file = null) {
    ElementActions.fetchMoleculeByMolfile(molfile, svg_file);
  }

  _submitFunction() {
    let {sample, reaction, materialGroup} = this.state;

    if(reaction) {
      if(sample.isNew) {
        ElementActions.createSampleForReaction(sample);
      } else {
        ElementActions.updateSampleForReaction(sample);
      }
    } else {
      if(sample.isNew) {
        ElementActions.createSample(sample);
      } else {
        ElementActions.updateSample(new Sample(sample));
      }
    }
  }

  _submitLabel() {
    let {sample} = this.state;

    if(sample.isNew) {
      return "Create";
    } else {
      return "Save";
    }
  }

  sampleIsValid() {
    const {sample, loadingMolecule} = this.state;
    return (sample.isValid && !loadingMolecule) || sample.is_scoped == true;
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
        <Input ref="topSecretInput" type="checkbox" label="Top secret"
        checked={sample.is_top_secret}
        onChange={(e) => this.handleFieldChanged(sample, 'is_top_secret', e.target.checked)}/>
      )
    }
  }

  moleculeInput(sample) {
    return (
      <Input type="text" label="Molecule" ref="moleculeInput"
             buttonAfter={this.structureEditorButton(sample.isMethodDisabled('molecule_iupac_name'))}
             value={sample.molecule && (sample.molecule.iupac_name || sample.molecule.sum_formular)}
             disabled={sample.isMethodDisabled('molecule_iupac_name')}
             readOnly={sample.isMethodDisabled('molecule_iupac_name')}
             onChange={(e) => this.handleFieldChanged(sample, 'molecule_iupac_name', e.target.value)}
      />
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
      <Input type="text" label={label}
             value={sample[field]}
             onChange={(e) => {this.handleFieldChanged(sample, field, e.target.value)}}
             disabled={disabled || sample.isMethodDisabled(field)}
             readOnly={disabled || sample.isMethodDisabled(field)}
      />
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

  attachedAmountInput(sample) {
    if(!sample.contains_residues)
      return false;

    return this.numInput(sample, 'defined_part_amount', 'g',
    ['milli','none'], 4, 'Attached', 'attachedAmountMg', true, "Weight of the defined part")
  }

  numInput(sample, field, unit, prefixes, precision, label, ref = '', disabled = false, title='') {
    if(sample.contains_residues && unit == 'l')
      return false;

    return (
      <Col md={2} key={field + sample.id.toString()}>
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

  sampleAmount(sample) {
    let content = [];
    if(sample.isMethodDisabled('amount_value') == false) {
      if(sample.isMethodRestricted('molecule') == true) {
        content.push(
          this.numInput(sample, 'amount_g', 'g',['milli','none'], 4, 'Amount', 'massMgInput')
        )
      } else {
        content.push(
          this.numInput(sample, 'amount_g', 'g',['milli','none'], 4, 'Amount', 'massMgInput')
        )

        if(!sample.contains_residues)
          content.push(
            this.numInput(sample, 'amount_l', 'l', ['milli','micro','none'], 5, '\u202F', 'l' )
          )

        content.push(
          this.numInput(sample, 'amount_mol', 'mol', ['milli','none'], 4, '\u202F', 'amountInput' )
        )

        if(sample.contains_residues)
          content.push(
            this.attachedAmountInput(sample)
          )
      }
     return content;
    } else {
      return (
        <Input type="text" label="Amount" disabled defaultValue="***" readOnly/>
      )
    }
  }

  sampleDescription(sample) {
    return (
      <Input type="textarea" label="Description" ref="descriptionInput"
             placeholder={sample.description}
             value={sample.description}
             onChange={(e) => this.handleFieldChanged(sample, 'description', e.target.value)}
             rows={2}
             disabled={sample.isMethodDisabled('description')}
        />
    )
  }

  sampleSaveButton() {
    return (
      <Button bsStyle="warning"
              className="external-save-btn"
              onClick={this._submitFunction.bind(this)}
              disabled={!this.sampleIsValid()}>
        {this._submitLabel()}
      </Button>
    )
  }

  render() {
    let sample = this.state.sample || {}

    return (
      <div className="sample-form">
        <Row>
          <Col md={6}>{this.moleculeInput(sample)}</Col>
          <Col md={2} className="top-secret-checkbox">
            {this.topSecretCheckbox(sample)}
          </Col>
          <Col md={3}></Col>
          <Col md={1}>{this.sampleSaveButton()}</Col>
        </Row>

        <Row>
          <Col md={4}>{this.textInput(sample, 'name', 'Name')}</Col>
          <Col md={4}>
            {this.textInput(sample, 'external_label', 'External label')}
          </Col>
          <Col md={4}>{this.textInput(sample, 'location', 'Location')}</Col>
        </Row>

        <Row>
          {this.sampleAmount(sample)}
          {this.numInput(sample, 'density', 'g/ml', ['none'], 5, 'Density')}
          {this.numInput(sample, 'boiling_point', '°C', ['none'], 5, 'Boiling point')}
          {this.numInput(sample, 'melting_point', '°C', ['none'], 5, 'Melting point')}
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
