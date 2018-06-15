import React from 'react';
import { Button, Checkbox, FormGroup, FormControl, InputGroup, ControlLabel,
  Table, Glyphicon } from 'react-bootstrap';
import Select from 'react-select';
import DetailActions from './actions/DetailActions';
import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import { solventOptions } from './staticDropdownOptions/options';

export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      molarityBlocked: (props.sample.molarity_value || 0) <= 0,
      isMolNameLoading: false,
    };

    this.handleFieldChanged = this.handleFieldChanged.bind(this);
    this.updateMolName = this.updateMolName.bind(this);
    this.updateStereoAbs = this.updateStereoAbs.bind(this);
    this.updateStereoRel = this.updateStereoRel.bind(this);
    this.addMolName = this.addMolName.bind(this);
    this.showStructureEditor = this.showStructureEditor.bind(this);
  }

  componentWillReceiveProps() {
    this.setState({ isMolNameLoading: false });
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
          onChange={(e) => this.handleFieldChanged(sample, 'is_top_secret', e.target.checked)}
        >
          Top secret
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

  handleFieldChanged(sample, field, e) {
    if (/amount/.test(field)) {
      this.handleAmountChanged(e);
    } else if (/molarity/.test(field)) {
      this.handleMolarityChanged(e);
    } else if (/density/.test(field)) {
      this.handleDensityChanged(e);
    } else if (e && e.value) {
      // for numeric inputs
      sample[field] = e.value;
    } else {
      sample[field] = e;
    }

    this.props.parent.setState({ sample });
  }

  textInput(sample, field, label, disabled = false) {
    return (
      <FormGroup>
        <ControlLabel>{label}</ControlLabel>
        <FormControl
          type="text"
          value={sample[field] || ''}
          onChange={(e) => {this.handleFieldChanged(sample, field, e.target.value)}}
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
        onChange={(e) => this.handleFieldChanged(sample, 'solvent', e)}
      />
    );
  }

  attachedAmountInput(sample, size) {
    if (!sample.contains_residues) return false;

    return this.numInput(sample, 'defined_part_amount', 'g',
      ['milli', 'none'], 4, 'Attached', 'attachedAmountMg',
      true, 'Weight of the defined part');
  }

  numInput(sample, field, unit, prefixes, precision, label, ref = '',
    disabled = false, title = '', block = false, notApplicable = false) {
    if (sample.contains_residues && unit === 'l') return false;
    const value = !isNaN(sample[field]) ? sample[field] : null;

    return (
      <td key={field + sample.id.toString()}>
        <NumeralInputWithUnitsCompo
          value={notApplicable ? 'N/A' : value}
          unit={unit}
          label={label}
          ref={ref}
          metricPrefix={prefixes[0]}
          metricPrefixes={prefixes}
          precision={precision}
          title={title}
          disabled={disabled}
          block={block}
          bsStyle={unit && sample.amount_unit === unit ? 'success' : 'default'}
          onChange={(e) => this.handleFieldChanged(sample, field, e)}
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
      //   content.push(this.numInput(sample, 'amount_g', 'g', ['milli', 'none'],
      //     4, 'Amount', 'massMgInput', isDisabled, ''));
      // } else {
      content.push(this.numInput(sample, 'amount_g', 'g', ['milli', 'none'],
        4, 'Amount', 'massMgInput', isDisabled, ''));

      if (!sample.contains_residues) {
        content.push(this.numInput(sample, 'amount_l', 'l',
          ['milli', 'micro', 'none'], 5, '\u202F', 'l',
          isDisabled, '', volumeBlocked));
      }

      content.push(this.numInput(sample, 'amount_mol', 'mol',
        ['milli', 'none'], 4, '\u202F', 'amountInput', isDisabled, ''));

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
          onChange={(e) => this.handleFieldChanged(sample, 'description', e.target.value)}
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
              </div>
            </td>
          </tr>

          <tr>
            <td colSpan="4">
              <div className="name-form">
                <div style={{ width: '20%' }}>
                  {this.textInput(sample, 'name', 'Name')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(sample, 'external_label', 'External label')}
                </div>
                <div style={{ width: '19%' }}>
                  {this.textInput(sample, 'location', 'Location')}
                </div>
                <div style={{ width: '40%' }}>
                  <label htmlFor="solventInput">Solvent</label>
                  {this.sampleSolvent(sample)}
                </div>
              </div>
            </td>
          </tr>

          <tr className="visible-hd">
            {this.sampleAmount(sample)}
            {
              this.numInput(sample, 'boiling_point', '°C', ['none'], 5,
                'Boiling point', '', polyDisabled, '', false, isPolymer)
            }
          </tr>

          <tr>
            {
              this.numInput(sample, 'density', 'g/ml', ['none'], 5,
                'Density', '', polyDisabled, '', densityBlocked, isPolymer)
            }
            {
              this.numInput(sample, 'molarity_value', 'M', ['none'],
                5, 'Molarity', '', polyDisabled, '', molarityBlocked, isPolymer)
            }
            {
              this.numInput(sample, 'purity', 'none', ['none'], 5,
                'Purity', '', isDisabled)
            }
            {
              this.numInput(sample, 'melting_point', '°C', ['none'], 5,
                'Melting point', '', polyDisabled, '', false, isPolymer)
            }
          </tr>

          <tr style={{ paddingTop: '15px' }}>
            <td colSpan="4">{this.sampleDescription(sample)}</td>
          </tr>
        </tbody>
      </Table>
    );
  }
}

SampleForm.propTypes = {
  sample: React.PropTypes.object,
  parent: React.PropTypes.object
}
