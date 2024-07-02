/* eslint-disable react/sort-comp */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, FormControl, InputGroup,
  OverlayTrigger, Tooltip, Row, Col,
  ButtonGroup
} from 'react-bootstrap';
import Select from 'react-select';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import NumericInputUnit from 'src/apps/mydb/elements/details/NumericInputUnit';
import TextRangeWithAddon from 'src/apps/mydb/elements/details/samples/propertiesTab/TextRangeWithAddon';
import { solventOptions } from 'src/components/staticDropdownOptions/options';
import SampleDetailsSolvents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsSolvents';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import Checkbox from 'src/components/legacyBootstrap/Checkbox'
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'
import Glyphicon from 'src/components/legacyBootstrap/Glyphicon'

export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      molarityBlocked: (props.sample.molarity_value || 0) <= 0,
      isMolNameLoading: false,
      moleculeFormulaWas: props.sample.molecule_formula,
      densityMolarity: props.sample.molarity_value !== 0 ? 'molarity' : 'density'
    };

    this.handleFieldChanged = this.handleFieldChanged.bind(this);
    this.updateMolName = this.updateMolName.bind(this);
    this.updateStereoAbs = this.updateStereoAbs.bind(this);
    this.updateStereoRel = this.updateStereoRel.bind(this);
    this.addMolName = this.addMolName.bind(this);
    this.showStructureEditor = this.showStructureEditor.bind(this);
    this.handleRangeChanged = this.handleRangeChanged.bind(this);
    this.handleSolventChanged = this.handleSolventChanged.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.switchDensityMolarity = this.switchDensityMolarity.bind(this);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps() {
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

  handleMolecularMassChanged(mass) {
    this.props.sample.setMolecularMass(mass);
  }

  handleSolventChanged(sample) {
    this.props.parent.setState({ sample });
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
        variant='light'
      >
        <i className="fa fa-pencil" />
      </Button>
    );
  }

  // Info button display info message when one hover over it
  infoButton() {
    return (
      <OverlayTrigger placement="top" overlay={this.infoMessage()}>
        <Button>
          <i className="fa fa-info" />
        </Button>
      </OverlayTrigger>
    );
  }

  infoMessage = () => (
    <Tooltip id="assignButton">
      Information mirrored to the reaction table describing the content of pure
      compound or amount of pure compound in a given solution
    </Tooltip>
  );

  // Input components of sample details should be disabled if detail level
  // does not allow to read their content
  topSecretCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Form.Check
          inputRef={(ref) => { this.topSecretInput = ref; }}
          checked={sample.is_top_secret}
          onChange={(e) => this.handleFieldChanged('is_top_secret', e.target.checked)}
          label="Top secret"
        />
      );
    }

    return (<span />);
  }

  drySolventCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Form.Check
          checked={sample.dry_solvent}
          onChange={(e) => this.handleFieldChanged('dry_solvent', e.target.checked)}
        
          label="Anhydrous"
          className="my-2"
        />
      );
    }

    return (<span />);
  }

  decoupledCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Form.Check
          inputRef={(ref) => { this.decoupledInput = ref; }}
          checked={sample.decoupled}
          onChange={(e) => this.handleFieldChanged('decoupled', e.target.checked)}
          label="Decoupled"
          className="my-2"
        />
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

  switchDensityMolarity(e) {
    this.setState({ densityMolarity: e });
  }

  stereoAbsInput() {
    const { sample } = this.props;

    const absOptions = [
      { label: 'any', value: 'any' },
      { label: 'rac', value: 'rac' },
      { label: 'meso', value: 'meso' },
      { label: 'delta', value: 'delta' },
      { label: 'lambda', value: 'lambda' },
      { label: '(S)', value: '(S)' },
      { label: '(R)', value: '(R)' },
      { label: '(Sp)', value: '(Sp)' },
      { label: '(Rp)', value: '(Rp)' },
      { label: '(Sa)', value: '(Sa)' },
      { label: '(Ra)', value: '(Ra)' },
    ];

    const value = sample.stereo ? sample.stereo.abs : 'any';

    return (
      <Form.Group>
        <Form.Label>Stereo Abs</Form.Label>
        <Select
          name="stereoAbs"
          clearable={false}
          disabled={!sample.can_update}
          options={absOptions}
          onChange={this.updateStereoAbs}
          value={value}
        />
      </Form.Group>
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
      <Form.Group style={{ width: '100%' }}>
        <Form.Label>Stereo Rel</Form.Label>
        <Select
          name="stereoRel"
          clearable={false}
          disabled={!sample.can_update}
          options={relOptions}
          onChange={this.updateStereoRel}
          value={value}
        />
      </Form.Group>
    );
  }

  moleculeInput() {
    const { sample } = this.props;
    const mnos = sample.molecule_names;
    const mno = sample.molecule_name;
    const newMolecule = !mno || sample._molecule.id !== mno.mid;
    let moleculeNames = newMolecule ? [] : [mno];
    if (sample && mnos) { moleculeNames = moleculeNames.concat(mnos); }
    const onOpenMolName = () => this.openMolName(sample);
    return (
      <Form.Group>
        <Form.Label>Molecule name</Form.Label>
        <InputGroup className='w-100'>
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
            className='flex-grow-1'
          />
          {this.structureEditorButton(!sample.can_update)}
        </InputGroup>
      </Form.Group>
    );
  }

  handleRangeChanged(field, lower, upper) {
    const { sample } = this.props;
    sample.updateRange(field, lower, upper);
    this.props.parent.setState({ sample });
  }

  handleFieldChanged(field, e, unit = null) {
    const { sample } = this.props;
    if (field === 'purity' && (e.value < 0 || e.value > 1)) {
      e.value = 1;
      sample[field] = e.value;
      NotificationActions.add({
        message: 'Purity value should be >= 0 and <=1',
        level: 'error'
      });
    } else if (/amount/.test(field)) {
      this.handleAmountChanged(e);
    } else if (/molarity/.test(field)) {
      this.handleMolarityChanged(e);
    } else if (/density/.test(field)) {
      this.handleDensityChanged(e);
    } else if (/molecular_mass/.test(field)) {
      this.handleMolecularMassChanged(e);
    } else if (field === 'xref_flash_point') {
      const object = { value: e, unit };
      sample.xref = { ...sample.xref, flash_point: object };
    } else if (/^xref_/.test(field)) {
      sample.xref ||= {};
      const key = field.split('xref_')[1];
      sample.xref[key] = e;
    } else if (e && (e.value || e.value === 0)) {
      // for numeric inputs
      sample[field] = e.value;
    } else {
      sample[field] = e;
    }

    sample.formulaChanged = this.formulaChanged();

    if (field === 'decoupled') {
      if (!sample[field]) {
        sample.sum_formula = '';
      } else {
        if (sample.sum_formula.trim() === '') sample.sum_formula = 'undefined structure';
        if (sample.residues && sample.residues[0] && sample.residues[0].custom_info) {
          sample.residues[0].custom_info.polymer_type = 'self_defined';
          delete sample.residues[0].custom_info.surface_type;
        }
      }
      if (!sample[field] && ((sample.molfile || '') === '')) {
        this.props.parent.setState({ sample });
      } else {
        this.props.parent.setState({ sample }, this.props.decoupleMolecule);
      }
    } else { this.props.parent.setState({ sample }); }
  }

  textInput(sample, field, label, disabled = false, readOnly = false) {
    const condition = field !== 'external_label' && field !== 'xref_inventory_label' && field !== 'name';
    const updateValue = (/^xref_/.test(field) && sample.xref
      ? sample.xref[field.split('xref_')[1]] : sample[field]) || '';
    return (
      <Form.Group bsSize={condition ? 'small' : null}>
        <Form.Label>{label}</Form.Label>
        <FormControl
          id={`txinput_${field}`}
          type="text"
          value={updateValue}
          onChange={(e) => { this.handleFieldChanged(field, e.target.value); }}
          disabled={disabled || !sample.can_update}
          readOnly={disabled || !sample.can_update || readOnly}
        />
      </Form.Group>
    );
  }

  inputWithUnit(sample, field, label) {
    const value = sample.xref && sample.xref[field.split('xref_')[1]] ? sample.xref[field.split('xref_')[1]].value : '';
    const unit = sample.xref && sample.xref[field.split('xref_')[1]] ? sample.xref[field.split('xref_')[1]].unit : '°C';
    return (
      <NumericInputUnit
        field="flash_point"
        inputDisabled={false}
        onInputChange={
          (newValue, newUnit) => this.handleFieldChanged(field, newValue, newUnit)
        }
        unit={unit}
        numericValue={value}
        label={label}
      />
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

    return this.numInput(
      sample,
      'defined_part_amount',
      'g',
      ['m', 'n'],
      4,
      'Attached',
      'attachedAmountMg',
      true,
      'Weight of the defined part'
    );
  }

  handleMetricsChange(e) {
    this.props.sample.setUnitMetrics(e.metricUnit, e.metricPrefix);
  }

  numInput(
    sample,
    field,
    unit,
    prefixes,
    precision,
    label,
    ref = '',
    disabled = false,
    title = '',
    block = false,
    notApplicable = false
  ) {
    if (sample.contains_residues && unit === 'l') return false;
    const value = !isNaN(sample[field]) ? sample[field] : null;
    const metricPrefixes = ['m', 'n', 'u'];
    let metric;
    if (unit === 'l') {
      metric = prefixes[1];
    } else if (unit === 'mol') {
      metric = prefixes[2];
    } else {
      metric = prefixes[0];
    }
    if (sample) {
      switch (field) {
        case 'amount_g': {
          const isAmountGValid = sample.metrics && sample.metrics.length > 2;
          const prefixAmountG = isAmountGValid ? sample.metrics[0] : 'm';
          metric = metricPrefixes.indexOf(prefixAmountG) > -1 ? prefixAmountG : 'm';
          break;
        }
        case 'amount_mol': {
          const isAmountMolValid = sample.metrics && sample.metrics.length > 2;
          const prefixAmountMol = isAmountMolValid ? sample.metrics[2] : 'm';
          metric = metricPrefixes.indexOf(prefixAmountMol) > -1 ? prefixAmountMol : 'm';
          break;
        }
        case 'amount_l': {
          const isAmountLValid = sample.metrics && sample.metrics.length > 3;
          const prefixAmountL = isAmountLValid ? sample.metrics[3] : 'm';
          metric = metricPrefixes.indexOf(prefixAmountL) > -1 ? prefixAmountL : 'm';
          break;
        }
        default:
          console.warn(`Unknown field: ${field}`);
          metric = 'm';
          break;
      }
    }

    return (
      <NumeralInputWithUnitsCompo
        key={field + sample.id.toString()}
        value={notApplicable ? 'N/A' : value}
        unit={unit}
        label={label}
        ref={ref}
        metricPrefix={metric}
        metricPrefixes={prefixes}
        precision={precision}
        title={title}
        disabled={disabled}
        block={block}
        variant={unit && sample.amount_unit === unit ? 'success' : 'light'}
        onChange={(e) => this.handleFieldChanged(field, e)}
        onMetricsChange={(e) => this.handleMetricsChange(e)}
        id={`numInput_${field}`}
      />
    );
  }

  numInputWithoutTable(
    sample,
    field,
    unit,
    prefixes,
    precision,
    label,
    ref = '',
    disabled = false,
    title = '',
    block = false,
    notApplicable = false
  ) {
    if (sample.contains_residues && unit === 'l') return false;
    const value = !isNaN(sample[field]) ? sample[field] : null;

    let mpx;
    if (unit === 'l') {
      mpx = prefixes[1];
    } else if (unit === 'mol') {
      mpx = prefixes[2];
    } else {
      mpx = prefixes[0];
    }
    return (
      <NumeralInputWithUnitsCompo
        key={field + sample.id.toString()}
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
        variant={unit && sample.amount_unit === unit ? 'success' : 'light'}
        onChange={(e) => this.handleFieldChanged(field, e)}
      />
    );
  }

  sampleAmount(sample) {
    const isDisabled = !sample.can_update;
    const volumeBlocked = !sample.has_density && !sample.has_molarity;

    return (
      <Form.Group className="flex-grow-1">
        <Form.Label>Amount</Form.Label>
        {sample.isMethodDisabled('amount_value') ? (
          <FormControl type="text" disabled defaultValue="***" readOnly />
        ) : (
          <div className='d-flex gap-2'>
            {this.numInput(sample, 'amount_g', 'g', ['m', 'n', 'u'], 4, null, 'massMgInput', isDisabled, '')}
            {this.numInput(sample, 'amount_l', 'l', ['m', 'u', 'n'], 5, null, 'l', isDisabled, '', volumeBlocked)}
            {this.numInput(sample, 'amount_mol', 'mol', ['m', 'n'], 4, null, 'amountInput', isDisabled, '')}
            {sample.contains_residues && this.attachedAmountInput(sample)}
          </div>
        )}
      </Form.Group>
    );
  }
  
  densityMolarityInput(sample, isPolymer, molarityBlocked, densityBlocked) {
    return (
      <>
        <ButtonGroup className='mb-2'>
          <Button
            onClick={() => this.setState({ densityMolarity: 'density' })}
            variant={this.state.densityMolarity === 'density' ? 'info' : 'light'}
            size="xxsm"
          >
            Density
          </Button>
          <Button
            onClick={() => this.setState({ densityMolarity: 'molarity' })}
            variant={this.state.densityMolarity === 'molarity' ? 'info' : 'light'}
            size="xxsm"
          >
            Molarity
          </Button>
        </ButtonGroup>
        {this.state.densityMolarity === 'density' ? (
          this.numInputWithoutTable(sample, 'density', 'g/ml', ['n'], 5, '', '', densityBlocked, '', false, isPolymer)
        ) : (
          this.numInputWithoutTable(sample, 'molarity_value', 'M', ['n'], 5, '', '', molarityBlocked, '', false, isPolymer)
        )}
      </>
    );
  }

  sampleDescription(sample) {
    return (
      <Form.Group>
        <Form.Label>Description</Form.Label>
        <FormControl
          componentClass="textarea"
          ref={(input) => { this.descriptionInput = input; }}
          placeholder={sample.description}
          value={sample.description || ''}
          onChange={(e) => this.handleFieldChanged('description', e.target.value)}
          rows={2}
          disabled={!sample.can_update}
        />
      </Form.Group>
    );
  }


  // eslint-disable-next-line class-methods-use-this
  assignAmountType(reaction, sample) {
    // eslint-disable-next-line no-underscore-dangle
    reaction._products.map((s) => {
      if (s.id === sample.id) {
        // eslint-disable-next-line no-param-reassign
        sample.amountType = 'real';
      }
      return sample;
    });
  }

  render() {
    const sample = this.props.sample || {};
    const isPolymer = (sample.molfile || '').indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;
    const molarityBlocked = isDisabled ? true : this.state.molarityBlocked;
 
    const { enableSampleDecoupled } = this.props;

    if (sample.belongTo !== undefined && sample.belongTo !== null) {
      // assign amount type for product samples of reaction to real
      this.assignAmountType(sample.belongTo, sample);
    }

    return (
      <Form>
        <h5>Basic Properties:</h5>
        <Row className='align-items-end mb-4'>
          <Col>{this.moleculeInput()}</Col>
          <Col>{this.stereoAbsInput()}</Col>
          <Col>{this.stereoRelInput()}</Col>

                      {
                  enableSampleDecoupled && (
              <Col xs={2}>{this.decoupledCheckbox(sample)}</Col>
                  ) 
          }
        </Row>
        <Row className='align-items-end mb-4'>
             
          <Col>{this.textInput(sample, 'short_label', 'Short label', true)}</Col>
          <Col>{this.textInput(sample, 'external_label', 'External label')}</Col>
          <Col>{this.textInput(sample, 'xref_inventory_label', 'Inventory label')}</Col>
          <Col> {this.textInput(sample, 'location', 'Location')}</Col>
          <Col xs={2}>{this.decoupledCheckbox(sample)}</Col>
        </Row>
        {sample.decoupled && (
          <Row className='mb-4'>
            <Col>{this.numInput(sample, 'molecular_mass', 'g/mol', ['n'], 5, 'Molecular mass', '', isDisabled)}</Col>
            <Col>{this.textInput(sample, 'sum_formula', 'Sum formula')}</Col>
          </Row>
        )}
        <Row className='align-items-end mb-4'>
          <Col xs={6} className='d-flex align-items-end gap-2'>
            {this.infoButton()}
            {this.sampleAmount(sample)}
          </Col>
                          <Col style={{ width: '47%' }}>
                            <div className="name-form" style={{ marginBottom: '15px' }}>
                              <Tabs
                                style={{ width: '60%' }}
                                id="tab-density-molarity"
                                defaultActiveKey={sample.molarity_value !== 0 ? 'molarity' : 'density'}
                              >
                                <Tab eventKey="density" title="Density">
                                  {
                              this.numInputWithoutTable(sample, 'density', 'g/ml', ['n'], 5, '', '', polyDisabled, '', false, isPolymer)
                            }
                                </Tab>
                                <Tab eventKey="molarity" title="Molarity">
                                  {
                              this.numInputWithoutTable(sample, 'molarity_value', 'M', ['n'], 5, '', '', polyDisabled, '', false, isPolymer)
                            }
                                </Tab>
                              </Tabs>
                              <div style={{ width: '40%', paddingLeft: '5px' }}>
                                {
                            this.numInputWithoutTable(sample, 'purity', 'n', ['n'], 5, 'Purity/Concentration', '', isDisabled)
                          }
                              </div>
                            </div>
                      </Col>
              </Row>

        <h5>Additional properties of the pure compound:</h5>
        <Row className='mb-4'>

          <Col>{this.textInput(sample, 'xref_form', 'Form')}</Col>
          <Col>{this.textInput(sample, 'xref_color', 'Color')}</Col>
          <Col>{this.textInput(sample, 'xref_solubility', 'Solubility ')}</Col>
        </Row>
        <Row>
          <Col>
            <TextRangeWithAddon
              field="melting_point"
              label="Melting point"
              addon="°C"
              value={sample.melting_point_display}
              disabled={polyDisabled}
              onChange={this.handleRangeChanged}
              tipOnText="Use space-separated value to input a Temperature range"
            />
          </Col>

          <Col>
            <TextRangeWithAddon
              field="boiling_point"
              label="Boiling point"
              addon="°C"
              value={sample.boiling_point_display}
              disabled={polyDisabled}
              onChange={this.handleRangeChanged}
              tipOnText="Use space-separated value to input a Temperature range"
            />
          </Col>
          <Col>{this.inputWithUnit(sample, 'xref_flash_point', 'Flash Point')}</Col>
          <Col>{this.textInput(sample, 'xref_refractive_index', 'Refractive Index ')}</Col>
        </Row>

        <SampleDetailsSolvents
          sample={sample}
          onChange={this.handleSolventChanged}
        />
        {this.sampleDescription(sample)}
        {this.props.customizableField()}
      </Form>
    );
  }
}

SampleForm.propTypes = {
  sample: PropTypes.object,
  parent: PropTypes.object,
  customizableField: PropTypes.func.isRequired,
  enableSampleDecoupled: PropTypes.bool,
  decoupleMolecule: PropTypes.func.isRequired,
};

SampleForm.defaultProps = {
  enableSampleDecoupled: false,
};
