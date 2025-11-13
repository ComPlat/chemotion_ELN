/* eslint-disable max-len */
/* eslint-disable react/sort-comp */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Form, InputGroup, OverlayTrigger, Tooltip, Row, Col, ButtonGroup, Table } from 'react-bootstrap';
import { Select, CreatableSelect } from 'src/components/common/Select';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import NumericInputUnit from 'src/apps/mydb/elements/details/NumericInputUnit';
import TextRangeWithAddon from 'src/apps/mydb/elements/details/samples/propertiesTab/TextRangeWithAddon';
import { SampleTypesOptions } from 'src/components/staticDropdownOptions/options';
import SampleDetailsSolvents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsSolvents';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import InventoryFetcher from 'src/fetchers/InventoryFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import MoleculeFetcher from 'src/fetchers/MoleculesFetcher';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
import SampleDetailsComponents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponents';
import { SAMPLE_TYPE_HETEROGENEOUS_MATERIAL } from 'src/models/Sample';
import Component from 'src/models/Component';
import buildHeteroMaterialRows from 'src/utilities/sampleHeterogeneousCompositions';

const stateOptions = [
  { value: 'solid_powder', label: 'Solid Powder' },
  { value: 'solid_pellet', label: 'Solid Pellet' },
  { value: 'solid_monolith', label: 'Solid Monolith' },
  { value: 'solid_shape', label: 'Solid Shape' },
  { value: 'liquid_colloidal', label: 'Liquid Colloidal' },
  { value: 'liquid_solution', label: 'Liquid Solution' }
];

export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);

    const selectedOption = SampleTypesOptions.find((option) => option.value === props.sample.sample_type);

    this.state = {
      molarityBlocked: (props.sample.molarity_value || 0) <= 0,
      isMolNameLoading: false,
      moleculeFormulaWas: props.sample.molecule_formula,
      sumFormula: null,
      densityMolarity: props.sample.molarity_value !== 0 ? 'molarity' : 'density',
      selectedSampleType: selectedOption || SampleTypesOptions[0],
      enableComponentLabel: false,
      enableComponentPurity: false,
      moleculeNameInputValue: props.sample.molecule_name?.label || props.sample.molecule_name?.value || '',
      components: props.sample.components || [],
    };

    this.handleFieldChanged = this.handleFieldChanged.bind(this);
    this.updateMolName = this.updateMolName.bind(this);
    this.updateStereoAbs = this.updateStereoAbs.bind(this);
    this.updateStereoRel = this.updateStereoRel.bind(this);
    this.addMolName = this.addMolName.bind(this);
    this.handleRangeChanged = this.handleRangeChanged.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.fetchNextInventoryLabel = this.fetchNextInventoryLabel.bind(this);
    this.matchSelectedCollection = this.matchSelectedCollection.bind(this);
    this.markSumFormulaUndefined = this.markSumFormulaUndefined.bind(this);
    this.handleMassCalculation = this.handleMassCalculation.bind(this);
    this.calculateMolecularMass = this.calculateMolecularMass.bind(this);
    this.switchDensityMolarity = this.switchDensityMolarity.bind(this);
    this.handleMixtureComponentChanged = this.handleMixtureComponentChanged.bind(this);
    this.handleSampleTypeChanged = this.handleSampleTypeChanged.bind(this);
    this.stateSelect = this.stateSelect.bind(this);
  }

  componentDidUpdate(prevProps) {
    const { isMolNameLoading } = this.state;
    if (this.props != prevProps && isMolNameLoading) {
      this.setState({ isMolNameLoading: false });
    }

    // Sync moleculeNameInputValue when molecule_name changes
    const currentMoleculeName = this.props.sample?.molecule_name;
    const prevMoleculeName = prevProps.sample?.molecule_name;

    const prevComponents = this.props.sample?.components || [];
    const currentComponents = this.state?.components || [];

    if (JSON.stringify(prevComponents) !== JSON.stringify(currentComponents)) {
      this.setState({ components: this.props.sample.components });
    }

    if (currentMoleculeName !== prevMoleculeName) {
      // Use the label for display if available, otherwise fall back to value
      const displayValue = currentMoleculeName?.label || currentMoleculeName?.value || '';
      this.setState({
        moleculeNameInputValue: String(displayValue),
      });
    }
  }

  handleToggle = (key) => {
    this.setState((prevState) => ({
      [key]: !prevState[key],
    }));
  };

  renderCheckbox = (key, label, className) => {
    const isChecked = this.state[key];
    const id = `checkbox-${key}`;

    return (
      <Form.Check
        className={className}
        style={{ margin: 0 }}
        type="checkbox"
        id={id}
        checked={isChecked}
        onChange={() => this.handleToggle(key)}
        label={
          <label htmlFor={id} style={{ cursor: 'pointer', marginBottom: 0 }}>
            {label}
          </label>
        }
      />
    );
  };

  formulaChanged() {
    return this.props.sample.molecule_formula !== this.state.moleculeFormulaWas;
  }

  handleAmountChanged(amount) {
    const { sample } = this.props;

    // sample.initializeSampleDetails?.();
    // sample.sample_details.reference_component_changed = false;

    sample.setAmount(amount);
  }

  handleMolarityChanged(molarity) {
    this.props.sample.setMolarity(molarity);
    this.setState({ molarityBlocked: false });
  }

  handleSampleTypeChanged(sampleType) {
    const { sample, handleSampleChanged } = this.props;

    // selectedSampleType = {label: 'Single molecule', value: 'Micromolecule'}
    sample.updateSampleType(sampleType.value);
    this.setState({ selectedSampleType: sampleType });

    // If switching to Mixture, create component(s) from the current sample
    if (sampleType.value === 'Mixture' && sample.molecule && sample.molfile) {
      this.createComponentsFromCurrentSample(sample);
    }

    handleSampleChanged(sample);
  }

  /**
   * Creates components from the current sample when switching to Mixture type.
   * Uses the new method from Sample model.
   * @param {Sample} sample - The sample to create components from
   */
  createComponentsFromCurrentSample(sample) {
    // Use the new method from Sample model
    sample.createComponentsFromCurrentSample('ketcher')
      .then((result) => {
        if (result) {
          this.props.handleSampleChanged(sample);
        }
      })
      .catch((errorMessage) => {
        // Show error notification
        NotificationActions.add({
          title: 'Error Creating Components',
          message: `Failed to create components: ${errorMessage}`,
          level: 'error',
          position: 'tc',
          dismissible: 'button',
          autoDismiss: 10
        });
      });
  }

  handleDensityChanged(density) {
    this.props.sample.setDensity(density);
    this.setState({ molarityBlocked: true });
  }

  handleMolecularMassChanged(mass) {
    this.props.sample.setMolecularMass(mass);
  }

  handleMixtureAmountLChanged(e, sample) {
    const { handleSampleChanged } = this.props;

    const totalVolume = e && (e.value || e.value === 0) ? e.value : e;
    sample.setTotalMixtureVolume(totalVolume);

    // Trigger React re-render by calling handleSampleChanged directly
    // This ensures the UI updates to show the new concentration values
    handleSampleChanged(sample);
  }

  handleMixtureComponentChanged(sample) {
    this.props.handleSampleChanged(sample);
  }

  structureEditorButton(isDisabled) {
    return (
      <Button onClick={this.props.showStructureEditor} disabled={isDisabled} variant="light">
        <i className="fa fa-pencil" />
      </Button>
    );
  }

  // Info button display info message when one hover over it
  infoButton() {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="assignButton">
            Information mirrored to the reaction table describing the content of pure compound or amount of pure
            compound in a given solution
          </Tooltip>
        }>
        <Button>
          <i className="fa fa-info" />
        </Button>
      </OverlayTrigger>
    );
  }

  drySolventCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Form.Check
          id={`sample-dry-solvent-${sample.id}`}
          checked={sample.dry_solvent}
          onChange={(e) => this.handleFieldChanged('dry_solvent', e.target.checked)}
          label="Anhydrous"
          className="my-2"
        />
      );
    }

    return <span />;
  }

  decoupledCheckbox(sample) {
    if (sample.can_update) {
      return (
        <Form.Check
          id={`sample-decoupled-${sample.id}`}
          checked={sample.decoupled}
          onChange={(e) => this.handleFieldChanged('decoupled', e.target.checked)}
          label="Decoupled"
          className="my-2"
        />
      );
    }

    return <span />;
  }

  openMolName(sample) {
    this.setState({ isMolNameLoading: true });
    DetailActions.updateMoleculeNames(sample);
  }

  addMolName(moleculeName) {
    this.setState({ isMolNameLoading: true });
    DetailActions.updateMoleculeNames(this.props.sample, moleculeName);
  }

  updateMolName(e) {
    const { sample } = this.props;
    sample.molecule_name = e;
    this.props.handleSampleChanged(sample);
  }

  updateStereoAbs(e) {
    const { sample } = this.props;
    if (!sample.stereo) sample.stereo = {};
    sample.stereo.abs = e.value;
    this.props.handleSampleChanged(sample);
  }

  updateStereoRel(e) {
    const { sample } = this.props;
    if (!sample.stereo) sample.stereo = {};
    sample.stereo.rel = e.value;
    this.props.handleSampleChanged(sample);
  }

  switchDensityMolarity(e) {
    this.setState({ densityMolarity: e });
  }

  stereoAbsInput() {
    const { sample } = this.props;
    const absValue = sample.stereo ? sample.stereo.abs : 'any';

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

    return (
      <Form.Group>
        <Form.Label>Stereo abs</Form.Label>
        <Select
          name="stereoAbs"
          isDisabled={!sample.can_update}
          options={absOptions}
          onChange={this.updateStereoAbs}
          value={absOptions.find(({ value }) => value === absValue)}
        />
      </Form.Group>
    );
  }

  stereoRelInput() {
    const { sample } = this.props;
    const relValue = sample.stereo ? sample.stereo.rel : 'any';

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

    return (
      <Form.Group>
        <Form.Label>Stereo rel</Form.Label>
        <Select
          name="stereoRel"
          isDisabled={!sample.can_update}
          options={relOptions}
          onChange={this.updateStereoRel}
          value={relOptions.find(({ value }) => value === relValue)}
        />
      </Form.Group>
    );
  }

  moleculeInput() {
    const { sample } = this.props;
    const { isMolNameLoading, moleculeNameInputValue } = this.state;
    const mnos = sample.molecule_names;
    const mno = sample.molecule_name;
    const newMolecule = !mno || sample._molecule.id !== mno.mid;
    let moleculeNames = newMolecule ? [] : [mno];
    if (sample && mnos) {
      moleculeNames = moleculeNames.concat(mnos);
    }

<<<<<<< HEAD
    const formattedOptions = moleculeNames.filter((name) => name).map((name) => {
      if (typeof name === 'string') {
        return { label: name, value: name, type: '' };
      }
      return {
        label: name.label || name.value || name.name || String(name),
        value: name.value || name.label || name.name || String(name),
        type: name.desc || ''
      };
    }).filter((name, _, names) => {
      if (name.type === 'alternate' || name.type?.startsWith('defined by user')) {
        const hasMainVersion = names.some(
          (other) => other.label === name.label
            && !(other.type === 'alternate' || other.type?.toLowerCase().startsWith('defined by user'))
        );
        return !hasMainVersion;
      }
      return true;
    });
=======
    const formattedOptions = moleculeNames
      .filter((name) => name)
      .map((name) => {
        if (typeof name === 'string') {
          return { label: name, value: name };
        }
        return {
          label: name.label || name.value || name.name || String(name),
          value: name.value || name.label || name.name || String(name),
        };
      });
>>>>>>> c0508b3a8 (chore: UI for sample type HeterogeneousMaterial)

    return (
      <Form.Group>
        <Form.Label>Molecule name</Form.Label>
        <InputGroup>
          <CreatableSelect
            name="moleculeName"
            isClearable
            isInputEditable
            inputValue={moleculeNameInputValue}
            isDisabled={!sample.can_update}
            options={formattedOptions}
            onMenuOpen={() => this.openMolName(sample)}
            onChange={(selectedOption) => {
              const value = selectedOption ? selectedOption.label : '';
              this.setState({ moleculeNameInputValue: value });
              this.updateMolName(selectedOption);
            }}
            formatOptionLabel={(option, { context }) => {
              if (context === 'menu') {
                return option.type ? `${option.label}(${option.type})` : option.label;
              }
              return option.label;
            }}
            onInputChange={(inputValue, { action }) => {
              if (action === 'input-change') {
                this.setState({ moleculeNameInputValue: inputValue });
              }
            }}
            isLoading={isMolNameLoading}
            value={
              formattedOptions.find(({ value, label }) => {
                if (!mno) return false;
                return String(value) === String(mno.value) || String(label) === String(mno.label);
              }) || null
            }
            onCreateOption={(inputValue) => {
              this.setState({ moleculeNameInputValue: inputValue });
              this.addMolName(inputValue);
            }}
            placeholder="Enter or select a molecule name"
            allowCreateWhileLoading
            formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
            className="flex-grow-1"
          />
          {this.structureEditorButton(!sample.can_update)}
        </InputGroup>
      </Form.Group>
    );
  }

  handleRangeChanged(field, lower, upper) {
    const { sample } = this.props;
    sample.updateRange(field, lower, upper);
    this.props.handleSampleChanged(sample);
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
              message:
                'Could not find next inventory label. ' +
                'Please assign a prefix and a counter for a valid collection first.',
              level: 'error',
            });
          }
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      NotificationActions.add({
        message: 'Please select the collection to which sample belongs first',
        level: 'error',
      });
    }
  }

  handleFieldChanged(field, e, unit = null) {
    const { sample, handleSampleChanged } = this.props;
    if (field === 'purity' && (e.value < 0 || e.value > 1)) {
      e.value = 1;
      sample[field] = e.value;
      NotificationActions.add({
        message: 'Purity value should be >= 0 and <=1',
        level: 'error',
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
        if (!sample.sum_formula || sample.sum_formula.trim() === '') sample.sum_formula = 'undefined structure';
        if (sample.residues && sample.residues[0] && sample.residues[0].custom_info) {
          sample.residues[0].custom_info.polymer_type = 'self_defined';
          delete sample.residues[0].custom_info.surface_type;
        }
      }
      if (!sample[field] && (sample.molfile || '') === '') {
        handleSampleChanged(sample);
      } else {
        handleSampleChanged(sample, this.props.decoupleMolecule);
      }
    } else {
      handleSampleChanged(sample);
    }
  }

  btnCalculateMolecularMass() {
    const { sumFormula } = this.state;

    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="molMass">calculate the molecular mass</Tooltip>}>
        <Button onClick={() => this.handleMassCalculation(sumFormula)} variant="light">
          <i className="fa fa-cog" />
        </Button>
      </OverlayTrigger>
    );
  }

  markUndefinedButton() {
    const resetTooltip = 'click to mark as undefined structure - it will reset the Molecular mass';

    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="markUndefined">{resetTooltip}</Tooltip>}>
        <Button onClick={this.markSumFormulaUndefined} variant="light">
          <i className="fa fa-tag" />
        </Button>
      </OverlayTrigger>
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
      level: 'error',
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
            level: 'error',
          });
        }
      })
      .catch((error) => {
        console.log(error);

        NotificationActions.add({
          message: 'An error occurred while calculating the molecular mass',
          level: 'error',
        });
      });
  }

  clearMolecularMass() {
    this.handleFieldChanged('molecular_mass', { value: null });
  }

  textInput(sample, field, label, disabled = false, readOnly = false) {
    const updateValue =
      (/^xref_/.test(field) && sample.xref ? sample.xref[field.split('xref_')[1]] : sample[field]) || '';

    return (
      <Form.Group className="w-100">
        <Form.Label>{label}</Form.Label>
        <Form.Control
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
        />
      </Form.Group>
    );
  }

  nextInventoryLabel(sample) {
    const overlayMessage = sample.isNew
      ? 'Inventory label will be auto generated on sample create,' +
        ' if sample belongs to a collection with a predefined label'
      : 'click to assign next inventory label';
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="FetchNextInventoryLabel">{overlayMessage}</Tooltip>}>
        <Button onClick={this.fetchNextInventoryLabel} disabled={sample.isNew} variant="light">
          <i className="fa fa-tag" />
        </Button>
      </OverlayTrigger>
    );
  }

  /**
   * Renders the inventory label input section with the text input and next label button.
   * @param {Object} sample - The sample object
   * @returns {JSX.Element} The rendered inventory label section
   */
  inventoryLabelSection(sample) {
    return (
      <>
        {this.textInput(sample, 'xref_inventory_label', 'Inventory label')}
        {this.nextInventoryLabel(sample)}
      </>
    );
  }

  inputWithUnit(sample, field, label) {
    const value = sample.xref && sample.xref[field.split('xref_')[1]] ? sample.xref[field.split('xref_')[1]].value : '';
    const unit = sample.xref && sample.xref[field.split('xref_')[1]] ? sample.xref[field.split('xref_')[1]].unit : '°C';
    return (
      <NumericInputUnit
        field="flash_point"
        inputDisabled={false}
        onInputChange={(newValue, newUnit) => this.handleFieldChanged(field, newValue, newUnit)}
        unit={unit}
        numericValue={value}
        label={label}
      />
    );
  }

  attachedAmountInput(sample) {
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
    const gasSample = sample.isGas() && disableFieldsForGasTypeSample.includes(field);
    const feedstockSample = sample.isFeedstock() && field === 'amount_g';
    const weightPercentageSample = sample.weight_percentage > 0;
    const overlayMessage = weightPercentageSample
      ? 'Amount field is disabled for samples that belong to reactions with weight percentage. '
        + 'To change the amount, please edit the material sample amount field using weight percentage field in the reaction scheme tab and save the reaction.'
      : null;
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
        variant={unit && sample.amount_unit === unit ? 'primary' : 'light'}
        onChange={(e) => this.handleFieldChanged(field, e)}
        onMetricsChange={(e) => this.handleMetricsChange(e)}
        id={`numInput_${field}`}
        showInfoTooltipTotalVol={showInfoTooltipTotalVol}
        overlayMessage={overlayMessage}
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
        variant={unit && sample.amount_unit === unit ? 'primary' : 'light'}
        onChange={(e) => this.handleFieldChanged(field, e)}
      />
    );
  }

  /**
   * Renders the total amount (volume) input for the sample if allowed.
   * @param {Object} sample - The sample object
   * @returns {JSX.Element|false} The rendered input or false if not applicable
   */
  totalMixtureVolume(sample) {
    const isDisabled = sample.isMethodDisabled('amount_value')
      || sample.gas_type === 'gas'
      || sample.gas_type === 'feedstock'
      || sample.contains_residues
      || !sample.can_update;

    const metricPrefixes = ['m', 'u', 'n'];
    const prefix = sample.metrics?.[3] && metricPrefixes.includes(sample.metrics[3])
      ? sample.metrics[3]
      : 'm';

    if (!isDisabled) {
      return (
        <NumeralInputWithUnitsCompo
          value={sample.amount_l}
          unit="l"
          label="Total volume"
          metricPrefix={prefix}
          metricPrefixes={metricPrefixes}
          precision={5}
          title="Total volume"
          variant="light"
          id="numInput_total_mixture_volume_l"
          showInfoTooltipTotalVol
          onChange={(e) => this.handleMixtureAmountLChanged(e, sample)}
        />
      );
    }
  }

  /**
   * Renders the mixture density display.
   * @param {Object} sample - The sample object
   * @returns {JSX.Element} The rendered density display
   */
  totalMixtureDensity(sample) {
    const isDisabled = !sample.can_update;

    if (isDisabled) return null;

    // Pass null/undefined when density is not set, so it displays as "n.d."
    // Only pass the actual value if density is set (including 0)
    const density = (sample.density != null && sample.density !== '') ? sample.density : null;

    return (
      <div>
        <NumeralInputWithUnitsCompo
          value={density}
          unit="g/ml"
          label="Mixture density"
          metricPrefix="n"
          metricPrefixes={['n']}
          precision={3}
          title="Mixture density"
          variant="light"
          id="numInput_total_mixture_density"
          disabled
        />
      </div>
    );
  }

  /**
   * Renders a disabled input showing the required total volume for the sample mixture.
   * @returns {JSX.Element} The rendered required volume input
   */
  totalRequiredAmount() {
    const { sample } = this.props;

    const requiredTotalVolume = sample.calculateRequiredTotalVolume();

    return (
      <NumeralInputWithUnitsCompo
        value={requiredTotalVolume}
        unit="l"
        label="Required volume"
        metricPrefix="m"
        metricPrefixes={['m', 'u', 'n']}
        precision={5}
        title="Required volume"
        disabled
        variant="light"
        id="numInput_amount_l"
        showInfoTooltipRequiredVol
      />
    );
  }

  /**
   * Renders the total mixture mass using NumeralInputWithUnitsCompo, similar to Required volume.
   * @returns {JSX.Element|null}
   */
  totalMixtureMass() {
    const { sample } = this.props;
    const massG = sample.amount_g || sample.total_mixture_mass_g || 0;

    return (
      <div>
        <NumeralInputWithUnitsCompo
          value={massG}
          unit="g"
          label="Total mixture mass"
          metricPrefix="m"
          metricPrefixes={['m', 'n', 'u']}
          precision={6}
          title="Total mixture mass"
          disabled
          variant="light"
          id="numInput_total_mixture_mass_g"
        />
      </div>
    );
  }

  sampleAmount(sample) {
    const belongsToWeightPercentageReaction = sample.weight_percentage > 0;
    const isDisabled = !sample.can_update || belongsToWeightPercentageReaction;
    const volumeBlocked = !sample.has_density && !sample.has_molarity;

    return (
      <Form.Group className="flex-grow-1">
        <Form.Label>Amount</Form.Label>
        {sample.isMethodDisabled('amount_value') ? (
          <Form.Control type="text" disabled defaultValue="***" readOnly />
        ) : (
          <div className="d-flex gap-2">
            {this.numInput(sample, 'amount_g', 'g', ['m', 'n', 'u'], 4, null, 'massMgInput', isDisabled, '')}
            {this.numInput(sample, 'amount_l', 'l', ['m', 'u', 'n'], 5, null, 'l', isDisabled, '', volumeBlocked)}
            {this.numInput(sample, 'amount_mol', 'mol', ['m', 'n'], 4, null, 'amountInput', isDisabled, '')}
          </div>
        )}
      </Form.Group>
    );
  }

  densityMolarityInput(sample) {
    const { densityMolarity } = this.state;
    const isPolymer = (sample.molfile || '').indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;

    return (
      <>
        <ButtonGroup className="mb-2">
          <ButtonGroupToggleButton
            onClick={() => this.setState({ densityMolarity: 'density' })}
            active={densityMolarity === 'density'}
            size="xxsm">
            Density
          </ButtonGroupToggleButton>
          <ButtonGroupToggleButton
            onClick={() => this.setState({ densityMolarity: 'molarity' })}
            active={densityMolarity === 'molarity'}
            size="xxsm">
            Molarity
          </ButtonGroupToggleButton>
        </ButtonGroup>
        {densityMolarity === 'density'
          ? this.numInputWithoutTable(sample, 'density', 'g/ml', ['n'], 5, '', '', polyDisabled, '', false, isPolymer)
          : this.numInputWithoutTable(
              sample,
              'molarity_value',
              'M',
              ['n'],
              5,
              '',
              '',
              polyDisabled,
              '',
              false,
              isPolymer
            )}
      </>
    );
  }

  sampleDescription(sample) {
    return (
      <Form.Group className="my-4">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          placeholder={sample.description}
          value={sample.description || ''}
          onChange={(e) => this.handleFieldChanged('description', e.target.value)}
          rows={2}
          disabled={!sample.can_update}
        />
      </Form.Group>
    );
  }

  /**
   * Renders the sample type selection input.
   * Allows the user to select the type of sample (e.g., Mixture, Micromolecule).
   * @returns {JSX.Element} The rendered sample type selects input
   */
  sampleTypeInput() {
    const { sample } = this.props;
    const { selectedSampleType } = this.state;

    return (
      <Form.Group>
        <Form.Label>Sample type</Form.Label>
        <Select
          name="sampleType"
          clearable={false}
          disabled={!sample.can_update}
          value={selectedSampleType}
          onChange={(value) => this.handleSampleTypeChanged(value)}
          options={SampleTypesOptions}
        />
      </Form.Group>
    );
  }

  /**
   * Renders the list of mixture components for the sample.
   * Passes state flags for component label and purity to the child component.
   * @param {Object} sample - The sample object
   * @returns {JSX.Element} The rendered mixture components list
   */
  mixtureComponentsList(sample) {
    const { enableComponentLabel, enableComponentPurity } = this.state;

    return (
      <Row className="mb-4">
        <Col>
          <SampleDetailsComponents
            sample={sample}
            onChange={this.handleMixtureComponentChanged}
            enableComponentLabel={enableComponentLabel}
            enableComponentPurity={enableComponentPurity}
            setComponentDeletionLoading={this.props.setComponentDeletionLoading}
          />
        </Col>
      </Row>
    );
  }

  dimensionFieldGroup(sample) {
    return (
      <Row>
        <Col>{this.textInput(sample, 'height', 'Height')}</Col>
        <Col>{this.textInput(sample, 'width', 'Width')}</Col>
        <Col>{this.textInput(sample, 'length', 'Length')}</Col>
      </Row>
    );
  }

  stateSelect(sample) {
    return (
      <Form.Group controlId="sampleDetailLevelSelect">
        <Form.Label>State</Form.Label>
        <Form.Select
          onChange={(e) => {
            this.handleFieldChanged('state', e.target.value);
          }}
          value={sample.state || ''}
        >
          <option value="">Select a state</option>
          {stateOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    );
  }

  heterogeneousMaterialComponentsList(sample) {
    return (
      <>
        <h5 className="mt-4">Heterogeneous material components:</h5>
        <Row className="align-items-end mb-4">
          <Col>{this.moleculeInput()}</Col>
          <Col>{this.textInput(sample, 'short_label', 'Short label', true)}</Col>
        </Row>
        <Row className="align-items-end mb-4">
          <Col xs={4} className="d-flex align-items-end gap-2">
            {this.infoButton()}
            {this.sampleAmount(sample)}
          </Col>
          <Col>{this.dimensionFieldGroup(sample)}</Col>
        </Row>
        <Row>
          <Col>{this.stateSelect(sample)}</Col>
          <Col>{this.textInput(sample, 'color', 'Color')}</Col>
          <Col>{this.textInput(sample, 'storage_condition', 'Storage Conditions')}</Col>
        </Row>
        <Row>{this.heteroMaterialTable(sample)}</Row>
      </>
    );
  }

  handleComponentFieldChanged(index, field, value) {
    const { sample } = this.props;

    this.setState(
      (prevState) => {
        const updated = [...prevState.components];
        updated[index] = { ...updated[index], [field]: value };
        return { components: updated };
      },
      () => {
        sample.components = this.state.components.map((comp) => new Component(comp));
        this.props.handleSampleChanged(sample);
      }
    );
  }

  heteroMaterialTable() {
    const { components } = this.state;
    const { rowsData, totalMolarCalc, totalMolarExp } = buildHeteroMaterialRows(components);

    return (
      <>
        <h5 className="mt-3">Composition table:</h5>
        <Table responsive hover bordered>
          <thead>
            <tr>
              <th>Source</th>
              <th>Weight ratio exp.</th>
              <th>Molar Mass (g/mol)</th>
              <th>Weight ratio calc./%</th>
              <th>weight ratio (calc)/molar mass</th>
              <th>molar ratio (calc)/molar mass</th>
              <th>Molar ratio exp / %</th>
              <th>Molar ratio calc / %</th>
            </tr>
          </thead>
          <tbody>
            {rowsData.map((row) => (
              <tr key={`component${row.template_category}`}>
                <td>{row.sourceAlias || ''}</td>
                <td>
                  <Form.Control
                    type="number"
                    value={row.weight_ratio_exp}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      this.handleComponentFieldChanged(row.index, 'weight_ratio_exp', newValue);
                    }}
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    value={row.molar_mass}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      this.handleComponentFieldChanged(row.index, 'molar_mass', newValue);
                    }}
                  />
                </td>
                <td>{row.weightRatioCalcProcessed}</td>
                <td>{row.molarRatioCalcMM !== undefined && row.molarRatioCalcMM !== null ? row.molarRatioCalcMM : '-'}</td>
                <td>{row.weightRatioCalcMM !== undefined && row.weightRatioCalcMM !== null ? row.weightRatioCalcMM : '-'}</td>
                <td>{row.molarRatioExpPercent !== undefined && row.molarRatioExpPercent !== '-' ? row.molarRatioExpPercent : '-'}</td>
                <td>{row.molarRatioCalcPercent !== undefined && row.molarRatioCalcPercent !== '-' ? row.molarRatioCalcPercent : '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </>
    );
  }

  render() {
    const {
      enableSampleDecoupled, sample = {}, customizableField, handleSampleChanged
    } = this.props;
    const isPolymer = (sample.molfile || '').indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;
    const { selectedSampleType } = this.state;

    return (
      <Form>
        <Row className="align-items-end mb-4">{this.sampleTypeInput()}</Row>
        {selectedSampleType?.value !== 'Mixture' && selectedSampleType?.value !== SAMPLE_TYPE_HETEROGENEOUS_MATERIAL ? (
          <>
            <Row className="align-items-end mb-4">
              <Col>{this.moleculeInput()}</Col>
            </Row>
            <Row className="align-items-end mb-4">
              <Col>{this.textInput(sample, 'name', 'Sample name')}</Col>
              <Col>{this.stereoAbsInput()}</Col>
              <Col>{this.stereoRelInput()}</Col>
              {enableSampleDecoupled && <Col xs={2}>{this.decoupledCheckbox(sample)}</Col>}
            </Row>

              <Row className="align-items-end mb-4">
                <Col>{this.textInput(sample, 'short_label', 'Short label', true)}</Col>
                <Col>{this.textInput(sample, 'external_label', 'External label')}</Col>
                <Col className="d-flex align-items-end">
                  {this.inventoryLabelSection(sample)}
                </Col>
                <Col>{this.textInput(sample, 'location', 'Location')}</Col>
                <Col xs={2}>{this.drySolventCheckbox(sample)}</Col>
              </Row>

              {sample.decoupled && (
                <Row className="mb-4">
                  <Col>
                    {this.numInput(sample, 'molecular_mass', 'g/mol', ['m', 'n'], 5, 'Molecular mass', '', isDisabled)}
                  </Col>
                  <Col className="d-flex align-items-end">
                    {this.textInput(sample, 'sum_formula', 'Sum formula')}
                    {this.btnCalculateMolecularMass()}
                    {this.markUndefinedButton()}
                  </Col>
                </Row>
              )}

              <Row className="align-items-center g-2 mb-4">
                <Col xs={6} className="d-flex align-items-end gap-2">
                  {this.infoButton()}
                  {this.sampleAmount(sample)}
                </Col>
                {sample.contains_residues && (
                  <Col>{this.attachedAmountInput(sample)}</Col>
                )}
                <Col>
                  {this.densityMolarityInput(sample)}
                </Col>
                <Col className="gap-2">
                  {
                    this.numInputWithoutTable(sample, 'purity', 'n', ['n'], 5, 'Purity/Concentration', '', isDisabled)
                  }
                </Col>
              </Row>

              <Row className="mb-4">
                <Col>{this.textInput(sample, 'xref_form', 'Form')}</Col>
                <Col>{this.textInput(sample, 'xref_color', 'Color')}</Col>
                <Col>{this.textInput(sample, 'xref_solubility', 'Soluble in')}</Col>
              </Row>
              <Row className="align-items-end mb-4">
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
                <Col>{this.inputWithUnit(sample, 'xref_flash_point', 'Flash point')}</Col>
                <Col>{this.textInput(sample, 'xref_refractive_index', 'Refractive index')}</Col>
              </Row>
            </>
          ) : (
            <>
              <Row className="align-items-end mb-4">
                <Col md={4}>
                  {this.textInput(sample, 'name', 'Name')}
                </Col>
                <Col md={4}>
                  {this.textInput(sample, 'external_label', 'External label')}
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  {this.inventoryLabelSection(sample)}
                </Col>
              </Row>
              <Row className="align-items-end mb-4">
                <Col md={4}>
                  {this.textInput(sample, 'short_label', 'Short label', true)}
                </Col>
                <Col md={4}>
                  {this.textInput(sample, 'location', 'Location')}
                </Col>
                <Col md={4}>
                  {this.drySolventCheckbox(sample)}
                </Col>
              </Row>
            </>
          )
        }

        {selectedSampleType?.value === 'Mixture' && (
          <>
            <br />
            <h5>Mixture components:</h5>
            <Row className="mb-4 g-2">
              <Col xs={12} sm={6} lg={3}>
                {this.totalMixtureMass()}
              </Col>
              <Col xs={12} sm={6} lg={3}>
                {this.totalMixtureDensity(sample)}
              </Col>
              <Col xs={12} sm={6} lg={3}>
                {this.totalRequiredAmount()}
              </Col>
              <Col xs={12} sm={6} lg={3}>
                {this.totalMixtureVolume(sample)}
              </Col>
            </Row>

            {this.mixtureComponentsList(sample)}

            <Row className="mb-4">
              <Col>
                <div className="d-flex justify-content-center align-items-center gap-3">
                  {this.renderCheckbox('enableComponentPurity', 'Enable purity', 'enable-component-purity')}
                </div>
              </Col>
            </Row>
          </>
        )}

        {selectedSampleType?.value === SAMPLE_TYPE_HETEROGENEOUS_MATERIAL
          && this.heterogeneousMaterialComponentsList(sample)}

        <Row>
          <SampleDetailsSolvents sample={sample} onChange={handleSampleChanged} />
        </Row>

        {this.sampleDescription(sample)}
        {customizableField()}
      </Form>
    );
  }
}

SampleForm.propTypes = {
  sample: PropTypes.object.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
  showStructureEditor: PropTypes.func.isRequired,
  customizableField: PropTypes.func.isRequired,
  enableSampleDecoupled: PropTypes.bool,
  decoupleMolecule: PropTypes.func.isRequired,
};

SampleForm.defaultProps = {
  enableSampleDecoupled: false,
};
