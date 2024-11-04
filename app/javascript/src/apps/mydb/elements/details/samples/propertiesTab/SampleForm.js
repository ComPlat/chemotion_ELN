/* eslint-disable max-len */
/* eslint-disable react/sort-comp */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Checkbox, FormGroup, FormControl, InputGroup, ControlLabel,
  Table, Glyphicon, Tabs, Tab, OverlayTrigger, Tooltip, ListGroup, ListGroupItem
} from 'react-bootstrap';
import Select from 'react-select';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import NumericInputUnit from 'src/apps/mydb/elements/details/NumericInputUnit';
import TextRangeWithAddon from 'src/apps/mydb/elements/details/samples/propertiesTab/TextRangeWithAddon';
import { solventOptions, SampleTypesOptions } from 'src/components/staticDropdownOptions/options';
import SampleDetailsSolvents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsSolvents';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import InventoryFetcher from 'src/fetchers/InventoryFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import MoleculeFetcher from 'src/fetchers/MoleculesFetcher';
import SampleDetailsComponents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponents';

export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      molarityBlocked: (props.sample.molarity_value || 0) <= 0,
      isMolNameLoading: false,
      moleculeFormulaWas: props.sample.molecule_formula,
      sumFormula: null,
      selectedSampleType: props.sample.sample_type ? props.sample.sample_type : SampleTypesOptions[0],
      enableComponentLabel: false,
      enableComponentPurity: false,
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
    this.fetchNextInventoryLabel = this.fetchNextInventoryLabel.bind(this);
    this.matchSelectedCollection = this.matchSelectedCollection.bind(this);
    this.markSumFormulaUndefined = this.markSumFormulaUndefined.bind(this);
    this.handleMassCalculation = this.handleMassCalculation.bind(this);
    this.calculateMolecularMass = this.calculateMolecularMass.bind(this);
    this.handleMixtureComponentChanged = this.handleMixtureComponentChanged.bind(this);
    this.handleSampleTypeChanged = this.handleSampleTypeChanged.bind(this);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps() {
    this.setState({ isMolNameLoading: false });
  }

  handleToggle = (key) => {
    this.setState((prevState) => ({
      [key]: !prevState[key],
    }));
  };

  renderCheckbox = (key, label, className) => {
    const isChecked = this.state[key];

    return (
      <Checkbox
        className={className}
        style={{ margin: 0 }}
        checked={isChecked}
        onChange={() => this.handleToggle(key)}
      >
        {label}
      </Checkbox>
    );
  };

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

  handleSampleTypeChanged(sampleType) {
    const { sample } = this.props;
    sample.updateSampleType(sampleType.value);
    this.setState({ selectedSampleType: sampleType.value });
    this.props.parent.setState({ sample });
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

  handleMixtureComponentChanged(sample) {
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
      >
        <Glyphicon glyph="pencil" />
      </Button>
    );
  }

  // Info button display info message when one hover over it
  infoButton() {
    return (
      <div>
        <OverlayTrigger placement="top" overlay={this.infoMessage()}>
          <Button
            className="btn btn-circle btn-sm btn-info"
          >
            <Glyphicon glyph="info-sign" />
          </Button>
        </OverlayTrigger>
      </div>
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
        <Checkbox
          inputRef={(ref) => { this.topSecretInput = ref; }}
          checked={sample.is_top_secret}
          onChange={(e) => this.handleFieldChanged('is_top_secret', e.target.checked)}
        >
          Top secret
        </Checkbox>
      );
    }

    return (<span />);
  }

  drySolventCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Checkbox
          checked={sample.dry_solvent}
          onChange={(e) => this.handleFieldChanged('dry_solvent', e.target.checked)}
        >
          Anhydrous
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
          onChange={(e) => this.handleFieldChanged('decoupled', e.target.checked)}
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
      <FormGroup>
        <ControlLabel
          style={{
            display: 'block',
            marginBottom: '5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          Stereo Abs
        </ControlLabel>
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
      <FormGroup>
        <ControlLabel
          style={{
            display: 'block',
            marginBottom: '5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          Stereo Rel
        </ControlLabel>
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
    const { sample } = this.props;
    const mnos = sample.molecule_names;
    const mno = sample.molecule_name;
    const newMolecule = !mno || sample._molecule.id !== mno.mid;
    let moleculeNames = newMolecule ? [] : [mno];
    if (sample && mnos) { moleculeNames = moleculeNames.concat(mnos); }
    const onOpenMolName = () => this.openMolName(sample);
    return (
      <FormGroup>
        <ControlLabel>Molecule name</ControlLabel>
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

  /* eslint-disable camelcase */
  matchSelectedCollection(currentCollection) {
    const { sample } = this.props;
    const { collection_labels } = sample.tag?.taggable_data || [];
    const result = collection_labels?.filter((object) => object.id === currentCollection.id).length > 0;
    return result;
  }

  fetchNextInventoryLabel() {
    const { currentCollection } = UIStore.getState();
    if (this.matchSelectedCollection(currentCollection)) {
      InventoryFetcher.fetchInventoryOfCollection(currentCollection.id)
        .then((result) => {
          if (result && result.prefix && result.counter !== undefined) {
            const { prefix, counter } = result;
            const value = `${prefix}-${counter + 1}`;
            this.handleFieldChanged('xref_inventory_label', value);
          } else {
            NotificationActions.add({
              message: 'Could not find next inventory label. '
              + 'Please assign a prefix and a counter for a valid collection first.',
              level: 'error'
            });
          }
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      NotificationActions.add({
        message: 'Please select the collection to which sample belongs first',
        level: 'error'
      });
    }
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

  btnCalculateMolecularMass(sample) {
    const { sumFormula } = this.state;

    return (
      <div>
        <ControlLabel> &nbsp; </ControlLabel>
        <div>
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id="molMass">calculate the molecular mass</Tooltip>
            }
          >
            <Button
              className="btn btn-sm"
              onClick={() => this.handleMassCalculation(sumFormula)}
            >
              <Glyphicon glyph="cog" />
            </Button>
          </OverlayTrigger>
        </div>
      </div>
    );
  }

  markUndefinedButton(sample) {
    const resetTooltip = 'click to mark as undefined structure - it will reset the Molecular mass';

    return (
      <div>
        <ControlLabel> &nbsp; </ControlLabel>
        <div>
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id="markUndefined">{resetTooltip}</Tooltip>
            }
          >
            <Button
              className="btn btn-sm"
              onClick={this.markSumFormulaUndefined}
            >
              <Glyphicon glyph="tag" />
            </Button>
          </OverlayTrigger>
        </div>
      </div>
    );
  }

  handleMassCalculation(sumFormula) {
    if (sumFormula === 'undefined structure') {
      this.handleError();
    } else {
      this.calculateMolecularMass(sumFormula);
    }
  }

  handleError() {
    this.clearMolecularMass();
    NotificationActions.add({
      message: 'Could not calculate the molecular mass for this sum formula',
      level: 'error'
    });
  }

  markSumFormulaUndefined() {
    this.setState({ sumFormula: 'undefined structure' });
    this.handleFieldChanged('sum_formula', 'undefined structure');
    this.clearMolecularMass();
  }

  calculateMolecularMass(sumFormula) {
    MoleculeFetcher.calculateMolecularMassFromSumFormula(sumFormula)
      .then((result) => {
        if (result !== undefined) {
          this.handleFieldChanged('molecular_mass', { value: result });
        } else {
          NotificationActions.add({
            message: 'Could not calculate the molecular mass for this sum formula',
            level: 'error'
          });
        }
      })
      .catch((error) => {
        console.log(error);

        NotificationActions.add({
          message: 'An error occurred while calculating the molecular mass',
          level: 'error'
        });
      });
  }

  clearMolecularMass() {
    this.handleFieldChanged('molecular_mass', { value: null });
  }

  textInput(sample, field, label, disabled = false, readOnly = false) {
    const condition = field !== 'external_label' && field !== 'xref_inventory_label'
      && field !== 'name' && field !== 'location' && field !== 'short_label';
    const updateValue = (/^xref_/.test(field) && sample.xref
      ? sample.xref[field.split('xref_')[1]] : sample[field]) || '';
    const onBlurHandler = field === 'sum_formula' ? this.handleMassCalculation : null;
    const formControlStyle = field === 'name' ? { height: '38px', width: '100%' } : {};

    return (
      <FormGroup bsSize={condition ? 'small' : null}>
        <ControlLabel
          style={{
            display: 'block',
            marginBottom: '5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {label}
        </ControlLabel>
        <FormControl
          id={`txinput_${field}`}
          type="text"
          value={updateValue}
          onChange={(e) => {
            const newValue = e.target.value;
            this.setState({ sumFormula: newValue });
            this.handleFieldChanged(field, newValue);
          }}
          disabled={disabled || !sample.can_update}
          readOnly={disabled || !sample.can_update || readOnly}
          style={{ ...formControlStyle, width: '100%' }}
        />
      </FormGroup>
    );
  }

  nextInventoryLabel(sample) {
    const overlayMessage = sample.isNew
      ? 'Inventory label will be auto generated on sample create,'
       + ' if sample belongs to a collection with a predefined label'
      : 'click to assign next inventory label';
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ControlLabel> &nbsp; </ControlLabel>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id="FetchNextInventoryLabel">{overlayMessage}</Tooltip>
          }
        >
          <Button
            onClick={this.fetchNextInventoryLabel}
            disabled={sample.isNew}
          >
            <Glyphicon glyph="tag" />
          </Button>
        </OverlayTrigger>
      </div>
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
    notApplicable = false,
    showInfoTooltipTotalVol = false
  ) {
    if (sample.contains_residues && unit === 'l') return false;
    const value = !isNaN(sample[field]) ? sample[field] : null;
    const metricPrefixes = ['m', 'n', 'u'];
    const disableFieldsForGasTypeSample = ['amount_l', 'amount_g', 'amount_mol'];
    const gasSample = sample.gas_type === 'gas' && disableFieldsForGasTypeSample.includes(field);
    const feedstockSample = sample.gas_type === 'feedstock' && field === 'amount_g';
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
        case 'molecular_mass': {
          metric = 'n';
          break;
        }
        default:
          console.warn(`Unknown field: ${field}`);
          metric = 'm';
          break;
      }
    }

    return (
      <td key={field + sample.id.toString()}>
        <NumeralInputWithUnitsCompo
          value={notApplicable ? 'N/A' : value}
          unit={unit}
          label={label}
          ref={ref}
          metricPrefix={metric}
          metricPrefixes={prefixes}
          precision={precision}
          title={title}
          disabled={disabled || gasSample || feedstockSample}
          block={block}
          bsStyle={unit && sample.amount_unit === unit ? 'success' : 'default'}
          onChange={(e) => this.handleFieldChanged(field, e)}
          onMetricsChange={(e) => this.handleMetricsChange(e)}
          id={`numInput_${field}`}
          showInfoTooltipTotalVol={showInfoTooltipTotalVol}
        />
      </td>
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
        bsStyle={unit && sample.amount_unit === unit ? 'success' : 'default'}
        onChange={(e) => this.handleFieldChanged(field, e)}
      />
    );
  }

  totalAmount(sample) {
    const isDisabled = !sample.can_update;

    if (!sample.isMethodDisabled('amount_value') && !sample.contains_residues) {
      return this.numInput(
        sample,
        'amount_l',
        'l',
        ['m', 'u', 'n'],
        5,
        'Total volume',
        'l',
        isDisabled,
        '',
        false,
        false,
        true
      );
    }
  }

  totalRequiredAmount() {
    const { sample } = this.props;

    const requiredTotalVolume = sample.calculateRequiredTotalVolume() / 1000;

    return (
      <NumeralInputWithUnitsCompo
        value={requiredTotalVolume}
        unit="l"
        label="Required Total Volume"
        metricPrefix="m"
        metricPrefixes={['m', 'u', 'n']}
        precision={5}
        title="Required Total Volume'"
        disabled
        bsStyle="default"
        id="numInput_amount_l"
      />
    );
  }

  sampleAmount(sample) {
    const content = [];
    const isDisabled = !sample.can_update;
    const volumeBlocked = !sample.has_density && !sample.has_molarity;

    if (sample.isMethodDisabled('amount_value') === false) {
      // if (sample.isMethodRestricted('molecule') === true) {
      //   content.push(this.numInput(sample, 'amount_g', 'g', ['m', 'n'],
      //     4, 'Amount', 'massMgInput', isDisabled, ''));
      // } else {
      content.push(this.numInput(
        sample,
        'amount_g',
        'g',
        ['m', 'n', 'u'],
        4,
        'Amount',
        'massMgInput',
        isDisabled,
        ''
      ));

      if (!sample.contains_residues) {
        content.push(this.numInput(
          sample,
          'amount_l',
          'l',
          ['m', 'u', 'n'],
          5,
          '\u202F',
          'l',
          isDisabled,
          '',
          volumeBlocked
        ));
      }

      content.push(this.numInput(
        sample,
        'amount_mol',
        'mol',
        ['m', 'n'],
        4,
        '\u202F',
        'amountInput',
        isDisabled,
        ''
      ));

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
          onChange={(e) => this.handleFieldChanged('description', e.target.value)}
          rows={2}
          disabled={!sample.can_update}
        />
      </FormGroup>
    );
  }

  additionalProperties(sample) {
    const isPolymer = (sample.molfile || '').indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;

    return (
      <ListGroup fill="true" style={{marginBottom: 0}}>
        <h5 style={{ fontWeight: 'bold' }}>Additional properties of the pure compound:</h5>
        <ListGroupItem style={{ padding: '4px 4px 4px 4px', border: 'none' }}>
          <div className="properties-form" style={{ width: '100%' }}>
            <table width="100%">
              <tbody>
                <tr>
                  <td colSpan="3">
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ width: '33%', paddingLeft: '5px' }}>
                        {this.textInput(sample, 'xref_form', 'Form')}
                      </div>
                      <div style={{ width: '33%', paddingLeft: '5px' }}>
                        {this.textInput(sample, 'xref_color', 'Color')}
                      </div>
                      <div style={{ width: '33%', paddingLeft: '5px' }}>
                        {this.textInput(sample, 'xref_solubility', 'Soluble in ')}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan="4">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ width: '25%', paddingLeft: '5px', marginTop: '12px' }}>
                        <TextRangeWithAddon
                          field="melting_point"
                          label="Melting point"
                          addon="°C"
                          value={sample.melting_point_display}
                          disabled={polyDisabled}
                          onChange={this.handleRangeChanged}
                          tipOnText="Use space-separated value to input a Temperature range"
                        />
                      </div>
                      <div style={{ width: '25%', paddingLeft: '5px', marginTop: '12px' }}>
                        <TextRangeWithAddon
                          field="boiling_point"
                          label="Boiling point"
                          addon="°C"
                          value={sample.boiling_point_display}
                          disabled={polyDisabled}
                          onChange={this.handleRangeChanged}
                          tipOnText="Use space-separated value to input a Temperature range"
                        />
                      </div>
                      <div style={{ width: '25%', paddingLeft: '5px', marginTop: '12px' }}>
                        {this.inputWithUnit(sample, 'xref_flash_point', 'Flash Point')}
                      </div>
                      <div style={{ width: '25%', paddingLeft: '5px', marginTop: '12px' }}>
                        {this.textInput(sample, 'xref_refractive_index', 'Refractive Index ')}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ListGroupItem>
      </ListGroup>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  assignAmountType(reaction, sample) {
    if (reaction._products && reaction._products.length > 0) {
      // eslint-disable-next-line no-underscore-dangle
      reaction._products.map((s) => {
        if (s.id === sample.id) {
          // eslint-disable-next-line no-param-reassign
          sample.amountType = 'real';
        }
        return sample;
      });
    }
  }

  sampleTypeInput() {
    const { sample } = this.props;
    return (
      <FormGroup>
        <ControlLabel>Sample Type</ControlLabel>
        <Select
          name="sampleType"
          clearable={false}
          disabled={!sample.can_update}
          value={this.state.selectedSampleType}
          onChange={(value) => this.handleSampleTypeChanged(value)}
          options={SampleTypesOptions}
        />
      </FormGroup>
    );
  }

  mixtureComponentsList(sample) {
    const { enableComponentLabel, enableComponentPurity } = this.state;

    return (
      <tr>
        <SampleDetailsComponents
          sample={sample}
          onChange={this.handleMixtureComponentChanged}
          enableComponentLabel={enableComponentLabel}
          enableComponentPurity={enableComponentPurity}
        />
      </tr>
    );
  }

  render() {
    const sample = this.props.sample || {};
    const isPolymer = (sample.molfile || '').indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;
    const molarityBlocked = isDisabled ? true : this.state.molarityBlocked;
    const densityBlocked = isDisabled ? true : !molarityBlocked;
    const { enableSampleDecoupled, customizableField } = this.props;
    const { selectedSampleType } = this.state;

    if (sample.belongTo !== undefined && sample.belongTo !== null) {
      // assign amount type for product samples of reaction to real
      this.assignAmountType(sample.belongTo, sample);
    }

    return (
      <Table responsive className="sample-form">
        <tbody>
        <ListGroup fill="true">
          {this.sampleTypeInput()}
          <h5 style={{fontWeight: 'bold'}}>Basic Properties:</h5>
          <ListGroupItem style={{padding: '4px 4px 4px 4px', border: 'none'}}>
            {' '}
            {selectedSampleType !== 'Mixture' ? (
              <div className="properties-form" style={{width: '100%'}}>
                <tr>
                  <td colSpan="4">
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <div style={{flex: '2 1 0', paddingRight: '5px'}}>
                        {this.moleculeInput()}
                      </div>
                      <div style={{flex: '2 1 0', paddingLeft: '10px', paddingRight: '5px'}}>
                        {this.textInput(sample, 'name', 'Sample name')}
                      </div>
                      <div style={{flex: '1 1 0', marginRight: '5px', paddingLeft: '10px', paddingRight: '5px'}}>
                        {this.stereoAbsInput()}
                      </div>
                      <div style={{flex: '1 1 0', paddingLeft: '10px', marginRight: '5px'}}>
                        {this.stereoRelInput()}
                      </div>
                      {enableSampleDecoupled && (
                        <div style={{paddingLeft: '10px'}} className="decoupled-checkbox">
                          {this.decoupledCheckbox(sample)}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan="4">
                    <div style={{display: 'flex'}}>
                      <div style={{flex: '1 1 0', paddingRight: '5px'}}>
                        {this.textInput(sample, 'short_label', 'Short label', true)}
                      </div>
                      <div style={{flex: '1 1 0', paddingLeft: '10px', paddingRight: '5px'}}>
                        {this.textInput(sample, 'external_label', 'External label')}
                      </div>
                      <div
                        style={{
                          flex: '1 1 0',
                          paddingLeft: '10px',
                          paddingRight: '5px',
                          display: 'flex',
                          alignItems: 'flex-center',
                          flexWrap: 'nowrap',
                        }}
                      >
                        <div style={{flex: 1, minWidth: '150px'}}>
                          {this.textInput(sample, 'xref_inventory_label', 'Inventory label')}
                        </div>
                        <div style={{marginLeft: 0}}>
                          {this.nextInventoryLabel(sample)}
                        </div>
                      </div>
                      <div style={{flex: '1 1 0', paddingLeft: '10px', paddingRight: '5px'}}>
                        {this.textInput(sample, 'location', 'Location')}
                      </div>
                      <div
                        style={{display: 'flex', width: 'auto', paddingLeft: '5px'}}
                        className="top-secret-checkbox">
                        {this.drySolventCheckbox(sample)}
                      </div>
                    </div>
                  </td>
                </tr>
                {sample.decoupled
                  && (
                    <tr>
                      {
                        this.numInput(sample, 'molecular_mass', 'g/mol', ['m', 'n'], 5, 'Molecular mass', '', isDisabled)
                      }
                      <td colSpan="3">
                        <div style={{display: 'flex'}}>
                          {this.textInput(sample, 'sum_formula', 'Sum formula')}
                          {this.btnCalculateMolecularMass(sample)}
                          {this.markUndefinedButton(sample)}
                        </div>
                      </td>
                    </tr>
                  )}
                <tr className="visible-hd">
                  <td colSpan="6">
                    <table>
                      <tbody>
                      <tr>
                        <td style={{width: '3%'}}>
                          <div style={{marginBottom: '15px'}}>
                            {/* eslint-disable-next-line jsx-a11y/label-has-for */}
                            <label style={{height: '14px'}}/>
                            <InputGroup.Button id="email" name="email" type="email" placeholder="Email Address">
                              {this.infoButton()}
                            </InputGroup.Button>
                          </div>
                        </td>
                        {this.sampleAmount(sample)}
                        <td style={{width: '47%'}}>
                          <div className="name-form" style={{marginBottom: '15px'}}>
                            <Tabs
                              style={{width: '60%'}}
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
                            <div style={{width: '45%', paddingLeft: '5px'}}>
                              {
                                this.numInputWithoutTable(sample, 'purity', 'n', ['n'], 5, 'Purity/Concentration', '', isDisabled)
                              }
                            </div>
                          </div>
                        </td>
                      </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </div>
            ) : (
              <div className="name-form">
                <div style={{flex: '1'}}>
                  {this.textInput(sample, 'name', 'Name')}
                </div>
                <div style={{flex: '1', paddingLeft: '10px'}}>
                  {this.textInput(sample, 'external_label', 'External label')}
                </div>
                <div style={{flex: '1', paddingLeft: '10px'}}>
                  {this.textInput(sample, 'xref_inventory_label', 'Inventory label')}
                </div>
              </div>
            )}
          </ListGroupItem>
        </ListGroup>
        {selectedSampleType === 'Mixture' && (
          <>
            <tr>
              <ControlLabel>Mixture Components:</ControlLabel>
            </tr>

            <tr style={{float: 'right'}}>
              <td style={{width: '10%', paddingRight: '15px', verticalAlign: 'middle'}}>
                {this.totalRequiredAmount()}
              </td>
              <td style={{width: '10%', paddingRight: '15px', verticalAlign: 'middle'}}>
                {this.totalAmount(sample)}
              </td>
            </tr>

            {this.mixtureComponentsList(sample)}

            <tr>
              <td>
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
                }}>
                  {this.renderCheckbox('enableComponentLabel', 'Enable Label', 'enable-component-label')}
                  {this.renderCheckbox('enableComponentPurity', 'Enable Purity', 'enable-component-purity')}
                </div>
              </td>
            </tr>
          </>
        )}
        {this.additionalProperties(sample)}
        <tr>
          <td colSpan="4">
            <SampleDetailsSolvents
              sample={sample}
              onChange={this.handleSolventChanged}
            />
          </td>
        </tr>
        <tr style={{paddingTop: '15px'}}>
          <td colSpan="4">{this.sampleDescription(sample)}</td>
        </tr>
        <td colSpan="4">
          {customizableField}
        </td>

        </tbody>
      </Table>
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
