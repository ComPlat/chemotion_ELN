import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Button, InputGroup, Glyphicon, ControlLabel,
         Checkbox, FormControl, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Select from 'react-select3';
import Creatable from 'react-select3/creatable';

import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import TextRangeWithAddon from './TextRangeWithAddon';
import { solventOptions } from './staticDropdownOptions/options';


const selectInlineStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '30px',
    height: '30px'
  }),
  valueContainer: (provided, state) => ({
    ...provided,
    height: '30px',
    padding: '4px 10px',
    fontSize: '12px'
  }),
  input: (provided, state) => ({
    ...provided,
    margin: '0px'
  }),
  indicatorSeparator: state => ({
    display: 'none'
  }),
  indicatorsContainer: (provided, state) => ({
    ...provided,
    height: '30px'
  })
};

class SampleMoleculeInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isMolNameLoading: false
    };

    this.openMolName = this.openMolName.bind(this)
    this.addMolName = this.addMolName.bind(this)
    this.updateMolName = this.updateMolName.bind(this)
  }

  componentWillReceiveProps() {
    this.setState({ isMolNameLoading: false });
  }

  openMolName() {
    this.setState({ isMolNameLoading: true });
    this.props.updateMoleculeNames();
  }

  addMolName(value) {
    this.setState({ isMolNameLoading: true });
    this.props.updateMoleculeNames(value);
  }

  updateMolName(option) {
    this.props.onChange('molecule_name', option)
  }

  render() {
    const { sample, inline, disabled, onChange, showStructureEditor } = this.props

    const mnos = sample.molecule_names;
    const mno = sample.molecule_name;
    const newMolecule = !mno || sample._molecule.id !== mno.mid;
    let moleculeNames = newMolecule ? [] : [mno];
    if (sample && mnos) { moleculeNames = moleculeNames.concat(mnos); }

    const value = moleculeNames.find(el => el.value == (!newMolecule && mno && mno.value))

    return (
      <FormGroup style={{ width: '100%' }}>
        {!inline && <ControlLabel>Molecule</ControlLabel>}
        {' '}
        <InputGroup>
          <Creatable
            name="moleculeName"
            classNamePrefix="react-select"
            isClearable={false}
            isDisabled={disabled}
            options={moleculeNames}
            onMenuOpen={this.openMolName}
            onChange={this.updateMolName}
            isLoading={this.state.isMolNameLoading}
            value={value}
            onCreateOption={this.addMolName}
            styles={inline ? selectInlineStyles : {}}
            menuPortalTarget={inline ? document.body : null}
          />
          <InputGroup.Button>
            <Button
              onClick={showStructureEditor}
              disabled={disabled}
              style={inline ? {padding: '2px 12px'} : {}}>
              <Glyphicon glyph="pencil" />
            </Button>
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    );
  }
}

SampleMoleculeInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  showStructureEditor: PropTypes.func
}

class SampleCASInput extends Component {

  constructor(props) {
    super(props)
    this.state = {
      isLoading: false
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleCreate = this.handleCreate.bind(this)
    this.handleOpen = this.handleOpen.bind(this)
  }

  componentWillReceiveProps() {
    this.setState({ isLoading: false });
  }

  handleChange(option) {
    const { sample, onChange } = this.props;
    const xref = Object.assign({}, sample.xref)
    xref.cas = option
    onChange('xref', xref)
  }

  handleCreate(value) {
    const { sample, onChange } = this.props
    const { molecule } = sample
    molecule.cas = [...molecule.cas, value]
    onChange('molecule', molecule)
  }

  handleOpen(casArr) {
    if(casArr.length === 0) {
      this.setState({ isLoading: true });
      this.props.updateMoleculeCas()
    }
  }

  render() {
    const { sample, inline, disabled } = this.props
    const { molecule, xref } = sample;

    const cas = xref ? xref.cas : null;
    const casLabel = cas && cas.label ? cas.label : "";

    let casArr = [];
    if(molecule && molecule.cas) {
      casArr = molecule.cas.map(c => Object.assign({label: c}, {value: c}));
    }

    if (inline) {
      return (
        <FormGroup>
          <Creatable
            name="cas"
            classNamePrefix="react-select"
            isClearable={true}
            clearValue={this.handleChange}
            isDisabled={disabled}
            options={casArr}
            onMenuOpen={() => this.handleOpen(casArr)}
            onChange={this.handleChange}
            isLoading={this.state.isLoading}
            value={cas}
            onCreateOption={this.handleCreate}
            styles={inline ? selectInlineStyles : {}}
            menuPortalTarget={inline ? document.body : null}
          />
        </FormGroup>
      )
    } else {
      return (
        <InputGroup>
          <InputGroup.Addon>CAS</InputGroup.Addon>
          <Creatable
            name="cas"
            classNamePrefix="react-select"
            isClearable={true}
            clearValue={this.handleChange}
            isDisabled={disabled}
            options={casArr}
            onMenuOpen={() => this.handleOpen(casArr)}
            onChange={this.handleChange}
            isLoading={this.state.isLoading}
            value={cas}
            onCreateOption={this.handleCreate}
            styles={inline ? selectInlineStyles : {}}
            menuPortalTarget={inline ? document.body : null}
          />
          <InputGroup.Button>
            <OverlayTrigger placement="bottom"
                            overlay={<Tooltip id="assign_button">copy to clipboard</Tooltip>}>
              <Button active className="clipboardBtn"
                      data-clipboard-text={casLabel}>
                <i className="fa fa-clipboard"></i>
              </Button>
            </OverlayTrigger>
          </InputGroup.Button>
        </InputGroup>
      )
    }
  }
}

SampleCASInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

class SampleStereoAbsInput extends Component {

  handleUpdate(option) {
    const { sample, onChange } = this.props;
    const stereo = Object.assign({}, sample.stereo)
    stereo.abs = option.value
    onChange('stereo', stereo)
  }

  render() {
    const { sample, inline, disabled } = this.props;

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

    const value = sample.stereo ? absOptions.find(el => el.value == sample.stereo.abs) : absOptions[0];
    const style = inline ? {} : { width: '50%' }

    return (
      <FormGroup style={style}>
        {!inline && <ControlLabel>Stereo Abs</ControlLabel>}
        <Select
          name="stereoAbs"
          classNamePrefix="react-select"
          isClearable={false}
          isDisabled={disabled}
          options={absOptions}
          onChange={this.handleUpdate.bind(this)}
          value={value}
            styles={inline ? selectInlineStyles : {}}
          menuPortalTarget={inline ? document.body : null}
        />
      </FormGroup>
    );
  }
}

SampleStereoAbsInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

class SampleStereoRelInput extends Component {

  handleUpdate(option) {
    const { sample, onChange } = this.props;
    const stereo = Object.assign({}, sample.stereo)
    stereo.rel = option.value
    onChange('stereo', stereo)
  }

  render() {
    const { sample, inline, disabled } = this.props;

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

    const value = sample.stereo ? relOptions.find(el => el.value == sample.stereo.rel) : relOptions[0];
    const style = inline ? {} : { width: '50%' }

    return (
      <FormGroup style={style}>
        {!inline && <ControlLabel>Stereo Rel</ControlLabel>}
        <Select
          name="stereoRel"
          classNamePrefix="react-select"
          isClearable={false}
          isDisabled={disabled}
          options={relOptions}
          onChange={this.handleUpdate.bind(this)}
          value={value}
          styles={inline ? selectInlineStyles : {}}
          menuPortalTarget={inline ? document.body : null}
        />
      </FormGroup>
    );
  }
}

SampleStereoRelInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

const SampleTopSecretCheckbox = ({sample, inline, disabled, onChange}) => {
  if (!disabled) {
    return (
      <Checkbox
        checked={sample.is_top_secret}
        onChange={e => onChange('is_top_secret', e.target.checked)}
      >
        {!inline && 'Top secret'}
      </Checkbox>
    );
  }

  return (<span />);
}

SampleTopSecretCheckbox.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  onChange: PropTypes.func
}

const SampleTextInput = ({sample, inline, disabled, onChange, field, label}) => {
  return (
    <FormGroup bsSize={inline ? 'small' : null}>
      {label && <ControlLabel>{label}</ControlLabel>}
      <FormControl
        id={inline ? `txinput_${field}_${sample.id}` : `txinput_${field}` }
        type="text"
        value={(/^xref_/.test(field) ? sample.xref[field.split('xref_')[1]] : sample[field]) || ''}
        onChange={event => onChange(field, event.target.value)}
        disabled={disabled}
        readOnly={disabled}
      />
    </FormGroup>
  )
}

SampleTextInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  field: PropTypes.string,
  label: PropTypes.string
}

const SampleSolventInput = ({sample, inline, disabled, onChange}) => {
  const value = sample.solvent ? solventOptions.find(el => el.value == sample.solvent) : null
  const style = inline ? {} : { marginBottom: '15px' }

  return (
    <FormGroup style={style}>
      {!inline && <ControlLabel>Solvent</ControlLabel>}
      <Select
        id={inline ? `solventInput_${sample.id}` : `solventInput`}
        name="solvents"
        classNamePrefix="react-select"
        isClearable={true}
        isDisabled={disabled}
        options={solventOptions}
        onChange={option => onChange('solvent', option.value)}
        value={value}
        styles={inline ? selectInlineStyles : {}}
        menuPortalTarget={inline ? document.body : null}
      />
    </FormGroup>
  )
}

SampleSolventInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

const SampleNumeralInput = ({sample, inline, disabled, onChange, field, label, unit,
                             prefixes, precision, title, block, notApplicable }) => {

  if (sample.contains_residues && unit === 'l') return false;
  const value = !isNaN(sample[field]) ? sample[field] : null;
  const mpx = unit === 'l' ? prefixes[1] : unit === 'mol' ? prefixes[2] : prefixes[0];
  return (
    <NumeralInputWithUnitsCompo
      value={notApplicable ? 'N/A' : value}
      unit={unit}
      label={label}
      metricPrefix={mpx}
      metricPrefixes={prefixes}
      precision={precision}
      title={title}
      disabled={disabled}
      block={block}
      bsStyle={unit && sample.amount_unit === unit ? 'success' : 'default'}
      onChange={state => onChange(field, state)}
    />
  );
}

SampleNumeralInput.propTypes = {
  sample: PropTypes.object,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  field: PropTypes.string,
  label: PropTypes.string,
  unit: PropTypes.string,
  prefixes: PropTypes.array,
  precision: PropTypes.number,
  title: PropTypes.string,
  block: PropTypes.bool,
  notApplicable: PropTypes.bool
}

const SampleBoilingPointInput = ({ sample, inline, disabled, onChange }) => {
  return (
    <TextRangeWithAddon
      field="boiling_point"
      label={inline ? null : "Boiling point"}
      addon="°C"
      value={sample.boiling_point_display}
      disabled={disabled}
      onChange={onChange}
      tipOnText="Use space-separated value to input a Temperature range"
    />
  )
}

SampleBoilingPointInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

const SampleMeltingPointInput = ({ sample, inline, disabled, onChange }) => {
  return (
    <TextRangeWithAddon
      field="melting_point"
      label={inline ? null : "Melting point"}
      addon="°C"
      value={sample.melting_point_display}
      disabled={disabled}
      onChange={onChange}
      tipOnText="Use space-separated value to input a Temperature range"
    />
  )
}

SampleMeltingPointInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

const SampleAmountInput = ({ sample, inline, disabled, onChange }) => {
  const content = [];
  const volumeBlocked = !sample.has_density && !sample.has_molarity;

  if (sample.isMethodDisabled('amount_value') === false) {
    // if (sample.isMethodRestricted('molecule') === true) {
    //   content.push(this.numInput(sample, 'amount_g', 'g', ['m', 'n'],
    //     4, 'Amount', 'massMgInput', isDisabled, ''));
    // } else {
    content.push(
      <td key="amount_g" className="amount-input">
        <SampleNumeralInput sample={sample} inline={inline} disabled={disabled} onChange={onChange}
                            field="amount_g" unit="g" prefixes={['m', 'n']} precision={4} />
      </td>
    );

    if (!sample.contains_residues) {
      content.push(
        <td key="amount_l" className="amount-input">
          <SampleNumeralInput sample={sample} inline={inline} disabled={disabled} onChange={onChange}
                            field="amount_l" unit="l" prefixes={['m', 'u', 'n']} precision={5} block={volumeBlocked} />
        </td>
      )
    }

    content.push(
      <td key="amount_mol" className="amount-input">
        <SampleNumeralInput sample={sample} inline={inline} disabled={disabled} onChange={onChange}
                            field="amount_mol" unit="mol" prefixes={['m', 'n']} precision={4} />
      </td>
    );

    if (sample.contains_residues) {
      content.push(
        <td key="defined_part_amount" className="amount-input">
          <SampleNumeralInput sample={sample} inline={inline} disabled={true} onChange={onChange}
                              field="defined_part_amount" unit="g" prefixes={['m', 'n']} precision={4} title="Weight of the defined part" />
        </td>
      )
    }

    return content
  }

  return (
    <FormGroup>
      <ControlLabel>Amount</ControlLabel>
      <FormControl type="text" disabled defaultValue="***" readOnly />
    </FormGroup>
  );
}

SampleAmountInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

const SampleDescriptionInput = ({sample, inline, disabled, onChange}) => {
  return (
    <FormGroup bsSize={inline ? 'small' : null}>
      {!inline && <ControlLabel>Description</ControlLabel>}
      <FormControl
        id={inline ? `description_${sample.id}` : `description` }
        type={inline ? 'text' : 'textarea'}
        value={sample.description || ''}
        onChange={event => onChange('description', event.target.value)}
        disabled={disabled}
        readOnly={disabled}
        rows={inline ? null : 2}
      />
    </FormGroup>
  )
}

SampleDescriptionInput.propTypes = {
  sample: PropTypes.object,
  inline: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func
}

export { SampleMoleculeInput, SampleCASInput, SampleStereoAbsInput, SampleStereoRelInput,
         SampleTopSecretCheckbox, SampleTextInput, SampleSolventInput,
         SampleNumeralInput, SampleBoilingPointInput, SampleMeltingPointInput,
         SampleAmountInput, SampleDescriptionInput }
