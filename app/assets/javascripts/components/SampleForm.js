import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Checkbox, FormGroup, FormControl, InputGroup, ControlLabel,
  Table, Glyphicon
} from 'react-bootstrap';
import Select from 'react-select';
import DetailActions from './actions/DetailActions';
import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import TextRangeWithAddon from './TextRangeWithAddon';
import { solventOptions } from './staticDropdownOptions/options';

export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      molarityBlocked: (props.sample.molarity_value || 0) <= 0,
      isMolNameLoading: false,
      moleculeFormulaWas: props.sample.molecule_formula,
    };

    this.handleFieldChanged = this.handleFieldChanged.bind(this);
    this.updateMolName = this.updateMolName.bind(this);
    this.updateStereoAbs = this.updateStereoAbs.bind(this);
    this.updateStereoRel = this.updateStereoRel.bind(this);
    this.addMolName = this.addMolName.bind(this);
    this.showStructureEditor = this.showStructureEditor.bind(this);
    this.handleRangeChanged = this.handleRangeChanged.bind(this);
  }

  componentWillReceiveProps() {
    this.setState({ isMolNameLoading: false });
  }

  formulaChanged() {
    return this.props.sample.molecule_formula !== this.state.moleculeFormulaWas;
  }

  handleAmountChanged(amount) {
    this.props.sample.setAmount(amount);
  }

  handleMolarityChanged(molarity) {
    this.props.sample.setMolarity(molarity);
    this.setState({ molarityBlocked: false });
  }

  handleDensityChanged(density) {
    this.props.sample.setDensity(density);
    this.setState({ molarityBlocked: true });
  }

  showStructureEditor() {
    this.props.parent.setState({
      showStructureEditor: true,
    });
  }

  structureEditorButton(isDisabled) {
    return (
      <Button
        onClick={this.showStructureEditor}
        disabled={isDisabled}
      >
        <Glyphicon glyph="pencil" />
      </Button>
    );
  }

  // Input components of sample details should be disabled if detail level
  // does not allow to read their content
  topSecretCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Checkbox
          inputRef={(ref) => { this.topSecretInput = ref; }}
          checked={sample.is_top_secret}
          onChange={e => this.handleFieldChanged('is_top_secret', e.target.checked)}
        >
          Top secret
        </Checkbox>
      );
    }

    return (<span />);
  }

  decoupledCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Checkbox
          inputRef={(ref) => { this.decoupledInput = ref; }}
          checked={sample.decoupled}
          onChange={e => this.handleFieldChanged('decoupled', e.target.checked)}
        >
          Decoupled
        </Checkbox>
      );
    }

    return (<span />);
  }

  openMolName(sample) {
    this.setState({ isMolNameLoading: true });
    DetailActions.updateMoleculeNames(sample);
  }

  addMolName(moleculeName) {
    this.setState({ isMolNameLoading: true });
    DetailActions.updateMoleculeNames(this.props.sample, moleculeName.label);
  }

  updateMolName(e) {
    const { sample } = this.props;
    sample.molecule_name = e;
    this.props.parent.setState({ sample });
  }

  updateStereoAbs(e) {
    const { sample } = this.props;
    if (!sample.stereo) sample.stereo = {};
    sample.stereo.abs = e.value;
    this.props.parent.setState({ sample });
  }

  updateStereoRel(e) {
    const { sample } = this.props;
    if (!sample.stereo) sample.stereo = {};
    sample.stereo.rel = e.value;
    this.props.parent.setState({ sample });
  }

  stereoAbsInput() {
    const { sample } = this.props;

    const absOptions = [
      { label: 'any', value: 'any' },
      { label: 'rac', value: 'rac' },
      { label: 'meso', value: 'meso' },
      { label: '(S)', value: '(S)' },
      { label: '(R)', value: '(R)' },
      { label: '(Sp)', value: '(Sp)' },
      { label: '(Rp)', value: '(Rp)' },
      { label: '(Sa)', value: '(Sa)' },
      { label: '(Ra)', value: '(Ra)' },
    ];

    const value = sample.stereo ? sample.stereo.abs : 'any';

    return (
      <FormGroup style={{ width: '50%' }}>
        <ControlLabel>Stereo Abs</ControlLabel>
        <Select
          name="stereoAbs"
          clearable={false}
          disabled={!sample.can_update}
          options={absOptions}
          onChange={this.updateStereoAbs}
          value={value}
        />
      </FormGroup>
    );
  }

  stereoRelInput() {
    const { sample } = this.props;

    const relOptions = [
      { label: 'any', value: 'any' },
      { label: 'syn', value: 'syn' },
      { label: 'anti', value: 'anti' },
      { label: 'p-geminal', value: 'p-geminal' },
      { label: 'p-ortho', value: 'p-ortho' },
      { label: 'p-meta', value: 'p-meta' },
      { label: 'p-para', value: 'p-para' },
      { label: 'cis', value: 'cis' },
      { label: 'trans', value: 'trans' },
      { label: 'fac', value: 'fac' },
      { label: 'mer', value: 'mer' },
    ];

    const value = sample.stereo ? sample.stereo.rel : 'any';

    return (
      <FormGroup style={{ width: '50%' }}>
        <ControlLabel>Stereo Rel</ControlLabel>
        <Select
          name="stereoRel"
          clearable={false}
          disabled={!sample.can_update}
          options={relOptions}
          onChange={this.updateStereoRel}
          value={value}
        />
      </FormGroup>
    );
  }

  moleculeInput() {
    const sample = this.props.sample;
    const mnos = sample.molecule_names;
    const mno = sample.molecule_name;
    const newMolecule = !mno || sample._molecule.id !== mno.mid;
    let moleculeNames = newMolecule ? [] : [mno];
    if (sample && mnos) { moleculeNames = moleculeNames.concat(mnos); }
    const onOpenMolName = () => this.openMolName(sample);
    return (
      <FormGroup style={{ width: '100%' }}>
        <ControlLabel>Molecule</ControlLabel>
        <InputGroup>
          <Select.Creatable
            name="moleculeName"
            multi={false}
            disabled={!sample.can_update}
            options={moleculeNames}
            onOpen={onOpenMolName}
            onChange={this.updateMolName}
            isLoading={this.state.isMolNameLoading}
            value={!newMolecule && mno && mno.value}
            onNewOptionClick={this.addMolName}
            clearable={false}
          />
          <InputGroup.Button>
            {this.structureEditorButton(!sample.can_update)}
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    );
  }

  handleRangeChanged(field, lower, upper) {
    const { sample } = this.props;
    sample.updateRange(field, lower, upper);
    this.props.parent.setState({ sample });
  }

  handleFieldChanged(field, e) {
    const { sample } = this.props;

    if (/amount/.test(field)) {
      this.handleAmountChanged(e);
    } else if (/molarity/.test(field)) {
      this.handleMolarityChanged(e);
    } else if (/density/.test(field)) {
      this.handleDensityChanged(e);
    } else if (/^xref_/.test(field)) {
      const key = field.split('xref_')[1];
      sample.xref[key] = e;
    } else if (e && e.value) {
      // for numeric inputs
      sample[field] = e.value;
    } else {
      sample[field] = e;
    }

    sample.formulaChanged = this.formulaChanged();

    this.props.parent.setState({ sample });
  }

  textInput(sample, field, label, disabled = false) {
    return (
      <FormGroup>
        <ControlLabel>{label}</ControlLabel>
        <FormControl
          id={`txinput_${field}`}
          type="text"
          value={(/^xref_/.test(field) ? sample.xref[field.split('xref_')[1]] : sample[field]) || ''}
          onChange={(e) => { this.handleFieldChanged(field, e.target.value); }}
          disabled={disabled || !sample.can_update}
          readOnly={disabled || !sample.can_update}
        />
      </FormGroup>
    );
  }

  sampleSolvent(sample) {
    return (
      <Select
        ref={(input) => { this.solventInput = input; }}
        id="solventInput"
        name="solvents"
        style={{ marginBottom: '15px' }}
        multi={false}
        options={solventOptions}
        value={sample.solvent}
        disabled={!sample.can_update}
        onChange={(e) => this.handleFieldChanged('solvent', e)}
      />
    );
  }

  attachedAmountInput(sample, size) {
    if (!sample.contains_residues) return false;

    return this.numInput(sample, 'defined_part_amount', 'g',
      ['m', 'n'], 4, 'Attached', 'attachedAmountMg',
      true, 'Weight of the defined part');
  }

  numInput(sample, field, unit, prefixes, precision, label, ref = '',
    disabled = false, title = '', block = false, notApplicable = false) {
    if (sample.contains_residues && unit === 'l') return false;
    const value = !isNaN(sample[field]) ? sample[field] : null;

    const mpx = unit === 'l' ? prefixes[1] : unit === 'mol' ? prefixes[2] : prefixes[0];
    return (
      <td key={field + sample.id.toString()}>
        <NumeralInputWithUnitsCompo
          value={notApplicable ? 'N/A' : value}
          unit={unit}
          label={label}
          ref={ref}
          metricPrefix={mpx}
          metricPrefixes={prefixes}
          precision={precision}
          title={title}
          disabled={disabled}
          block={block}
          bsStyle={unit && sample.amount_unit === unit ? 'success' : 'default'}
          onChange={e => this.handleFieldChanged(field, e)}
        />
      </td>
    );
  }

  sampleAmount(sample) {
    const content = [];
    const isDisabled = !sample.can_update;
    const { molarityBlocked } = this.state;
    const volumeBlocked = !sample.has_density && !sample.has_molarity;

    if (sample.isMethodDisabled('amount_value') === false) {
      // if (sample.isMethodRestricted('molecule') === true) {
      //   content.push(this.numInput(sample, 'amount_g', 'g', ['m', 'n'],
      //     4, 'Amount', 'massMgInput', isDisabled, ''));
      // } else {
      content.push(this.numInput(sample, 'amount_g', 'g', ['m', 'n'],
        4, 'Amount', 'massMgInput', isDisabled, ''));

      if (!sample.contains_residues) {
        content.push(this.numInput(sample, 'amount_l', 'l',
          ['m', 'u', 'n'], 5, '\u202F', 'l',
          isDisabled, '', volumeBlocked));
      }

      content.push(this.numInput(sample, 'amount_mol', 'mol',
        ['m', 'n'], 4, '\u202F', 'amountInput', isDisabled, ''));

      if (sample.contains_residues) {
        content.push(this.attachedAmountInput(sample));
      }

      return content;
    }

    return (
      <FormGroup>
        <ControlLabel>Amount</ControlLabel>
        <FormControl type="text" disabled defaultValue="***" readOnly />
      </FormGroup>
    );
  }

  sampleDescription(sample) {
    return (
      <FormGroup>
        <ControlLabel>Description</ControlLabel>
        <FormControl
          componentClass="textarea"
          ref={(input) => { this.descriptionInput = input; }}
          placeholder={sample.description}
          value={sample.description || ''}
          onChange={e => this.handleFieldChanged('description', e.target.value)}
          rows={2}
          disabled={!sample.can_update}
        />
      </FormGroup>
    );
  }

  render() {
    const sample = this.props.sample || {};
    const isPolymer = sample.molfile.indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;
    const molarityBlocked = isDisabled ? true : this.state.molarityBlocked;
    const densityBlocked = isDisabled ? true : !molarityBlocked;

    return (
      <Table responsive className="sample-form">
        <tbody>
          <tr>
            <td colSpan="4">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '82%', display: 'flex' }}>
                  {this.moleculeInput()}
                  {this.stereoAbsInput()}
                  {this.stereoRelInput()}
                </div>
                <div style={{ width: '15%' }} className="top-secret-checkbox">
                  {this.topSecretCheckbox(sample)}
                </div>
                <div style={{ width: '15%' }} className="decoupled-checkbox">
                  {this.decoupledCheckbox(sample)}
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan="4">
              <div className="name-form">
                <div style={{ width: '30%' }}>
                  {this.textInput(sample, 'name', 'Name')}
                </div>
                <div style={{ width: '30%' }}>
                  {this.textInput(sample, 'external_label', 'External label')}
                </div>
                <div style={{ width: '40%' }}>
                  <label htmlFor="solventInput">Solvent</label>
                  {this.sampleSolvent(sample)}
                </div>
              </div>
            </td>
          </tr>

          { sample.decoupled &&
            <tr>
              {
                this.numInput(sample, 'molecular_mass', 'g/mol', ['n'], 5, 'Molecular mass', '', isDisabled, '', densityBlocked)
              }
              <td colSpan="3">
                {
                  this.textInput(sample, 'sum_formula', 'Sum formula')
                }
              </td>
            </tr>
          }

          <tr className="visible-hd">
            {this.sampleAmount(sample)}
            <td>
              <TextRangeWithAddon
                field="boiling_point"
                label="Boiling point"
                addon="°C"
                value={sample.boiling_point_display}
                disabled={polyDisabled}
                onChange={this.handleRangeChanged}
                tipOnText="Use space-separated value to input a Temperature range"
              />
            </td>
          </tr>

          <tr>
            <td>
              {
                this.textInput(sample, 'xref_optical_rotation', 'Optical rotation')
              }
            </td>
            <td>
              {
                this.textInput(sample, 'xref_rfvalue', 'Rf-Value')
              }
            </td>
            <td>
              {
                this.textInput(sample, 'xref_rfsovents', 'Rf-Sovents')
              }
            </td>
            <td>
              {
                this.textInput(sample, 'xref_supplier', 'Supplier')
              }
            </td>
          </tr>
          <tr>
            <td colSpan="4">
              <FormGroup>
                <ControlLabel>Private notes</ControlLabel>
                <FormControl
                  componentClass="textarea"
                  value={sample.xref.private_notes || ''}
                  onChange={e => this.handleFieldChanged('xref_private_notes', e.target.value)}
                  rows={2}
                  disabled={!sample.can_update}
                />
              </FormGroup>
            </td>
          </tr>

          <tr>
            {
              this.numInput(sample, 'density', 'g/ml', ['n'], 5, 'Density', '', polyDisabled, '', densityBlocked, isPolymer)
            }
            {
              this.numInput(sample, 'molarity_value', 'M', ['n'], 5, 'Molarity', '', polyDisabled, '', molarityBlocked, isPolymer)
            }
            {
              this.numInput(sample, 'purity', 'n', ['n'], 5, 'Purity', '', isDisabled)
            }
            <td>
              <TextRangeWithAddon
                field="melting_point"
                label="Melting point"
                addon="°C"
                value={sample.melting_point_display}
                disabled={polyDisabled}
                onChange={this.handleRangeChanged}
                tipOnText="Use space-separated value to input a Temperature range"
              />
            </td>
          </tr>

          <tr style={{ paddingTop: '15px' }}>
            <td colSpan="4">{this.sampleDescription(sample)}</td>
          </tr>
          <tr>
            <td colSpan="4">
              {this.textInput(sample, 'location', 'Location')}
            </td>
          </tr>
          {this.props.customizableField()}
        </tbody>
      </Table>
    );
  }
}

SampleForm.propTypes = {
  sample: PropTypes.object,
  parent: PropTypes.object,
  customizableField: PropTypes.func.isRequired
};
