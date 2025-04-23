/* eslint-disable max-len */
/* eslint-disable react/sort-comp */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, InputGroup,
  OverlayTrigger, Tooltip, Row, Col,
  ButtonGroup
} from 'react-bootstrap';
import { Select, CreatableSelect } from 'src/components/common/Select';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import NumericInputUnit from 'src/apps/mydb/elements/details/NumericInputUnit';
import TextRangeWithAddon from 'src/apps/mydb/elements/details/samples/propertiesTab/TextRangeWithAddon';
import { solventOptions } from 'src/components/staticDropdownOptions/options';
import SampleDetailsSolvents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsSolvents';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import InventoryFetcher from 'src/fetchers/InventoryFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import MoleculeFetcher from 'src/fetchers/MoleculesFetcher';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

export default class SampleForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      molarityBlocked: (props.sample.molarity_value || 0) <= 0,
      isMolNameLoading: false,
      moleculeFormulaWas: props.sample.molecule_formula,
      sumFormula: null,
      densityMolarity: props.sample.molarity_value !== 0 ? 'molarity' : 'density'
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
  }

  componentDidUpdate(prevProps) {
    const { isMolNameLoading } = this.state;
    if (this.props != prevProps && isMolNameLoading) {
      this.setState({ isMolNameLoading: false });
    }
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

  structureEditorButton(isDisabled) {
    return (
      <Button
        onClick={this.props.showStructureEditor}
        disabled={isDisabled}
        variant="light"
      >
        <i className="fa fa-pencil" />
      </Button>
    );
  }

  // Info button display info message when one hover over it
  infoButton() {
    return (
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id="assignButton">
            Information mirrored to the reaction table describing the content of pure
            compound or amount of pure compound in a given solution
          </Tooltip>
        )}
      >
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

    return (<span />);
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

    return (<span />);
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
        <Form.Label>Stereo Rel</Form.Label>
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
    const mnos = sample.molecule_names;
    const mno = sample.molecule_name;
    const newMolecule = !mno || sample._molecule.id !== mno.mid;
    let moleculeNames = newMolecule ? [] : [mno];
    if (sample && mnos) { moleculeNames = moleculeNames.concat(mnos); }
    return (
      <Form.Group>
        <Form.Label>Molecule name</Form.Label>
        <InputGroup className="z-4">
          <CreatableSelect
            name="moleculeName"
            isDisabled={!sample.can_update}
            options={moleculeNames}
            onMenuOpen={() => this.openMolName(sample)}
            onChange={this.updateMolName}
            isLoading={this.state.isMolNameLoading}
            value={moleculeNames.find(({ value }) => value === mno?.value)}
            onCreateOption={this.addMolName}
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
    if(this.matchSelectedCollection(currentCollection)) {
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
    const { sample, handleSampleChanged } = this.props;
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
        if (!sample.sum_formula || sample.sum_formula.trim() === '') sample.sum_formula = 'undefined structure';
        if (sample.residues && sample.residues[0] && sample.residues[0].custom_info) {
          sample.residues[0].custom_info.polymer_type = 'self_defined';
          delete sample.residues[0].custom_info.surface_type;
        }
      }
      if (!sample[field] && ((sample.molfile || '') === '')) {
        handleSampleChanged(sample);
      } else {
        handleSampleChanged(sample, this.props.decoupleMolecule);
      }
    } else { handleSampleChanged(sample); }
  }

  btnCalculateMolecularMass() {
    const { sumFormula } = this.state;

    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="molMass">calculate the molecular mass</Tooltip>
        }
      >
        <Button
          onClick={() => this.handleMassCalculation(sumFormula)}
          variant="light"
        >
          <i className="fa fa-cog" />
        </Button>
      </OverlayTrigger>
    );
  }

  markUndefinedButton() {
    const resetTooltip = 'click to mark as undefined structure - it will reset the Molecular mass';

    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="markUndefined">{resetTooltip}</Tooltip>
        }
      >
        <Button
          onClick={this.markSumFormulaUndefined}
          variant="light"
        >
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
    const updateValue = (/^xref_/.test(field) && sample.xref
      ? sample.xref[field.split('xref_')[1]] : sample[field]) || '';
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
      ? 'Inventory label will be auto generated on sample create,'
      + ' if sample belongs to a collection with a predefined label'
      : 'click to assign next inventory label';
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="FetchNextInventoryLabel">{overlayMessage}</Tooltip>
        }
      >
        <Button
          onClick={this.fetchNextInventoryLabel}
          disabled={sample.isNew}
          variant="light"
        >
          <i className="fa fa-tag" />
        </Button>
      </OverlayTrigger>
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
    notApplicable = false
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
            size="xxsm"
          >
            Density
          </ButtonGroupToggleButton>
          <ButtonGroupToggleButton
            onClick={() => this.setState({ densityMolarity: 'molarity' })}
            active={densityMolarity === 'molarity'}
            size="xxsm"
          >
            Molarity
          </ButtonGroupToggleButton>
        </ButtonGroup>
        {densityMolarity === 'density' ? (
          this.numInputWithoutTable(sample, 'density', 'g/ml', ['n'], 5, '', '', polyDisabled, '', false, isPolymer)
        ) : (
          this.numInputWithoutTable(sample, 'molarity_value', 'M', ['n'], 5, '', '', polyDisabled, '', false, isPolymer)
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
    const { enableSampleDecoupled, sample = {}, customizableField, handleSampleChanged } = this.props;
    const isPolymer = (sample.molfile || '').indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;
    const molarityBlocked = isDisabled ? true : this.state.molarityBlocked;

    if (sample.belongTo !== undefined && sample.belongTo !== null) {
      // assign amount type for product samples of reaction to real
      this.assignAmountType(sample.belongTo, sample);
    }

    return (
      <Form>
        <Row className="align-items-end mb-4">
          <Col>{this.moleculeInput()}</Col>
        </Row>
        <Row className="align-items-end mb-4">
          <Col>{this.textInput(sample, 'name', 'Sample name')}</Col>
          <Col>{this.stereoAbsInput()}</Col>
          <Col>{this.stereoRelInput()}</Col>
          {
            enableSampleDecoupled && (
              <Col xs={2}>{this.decoupledCheckbox(sample)}</Col>
            )
          }
        </Row>

        <Row className="align-items-end mb-4">
          <Col>{this.textInput(sample, 'short_label', 'Short label', true)}</Col>
          <Col>{this.textInput(sample, 'external_label', 'External label')}</Col>
          <Col className="d-flex align-items-end">
            {this.textInput(sample, 'xref_inventory_label', 'Inventory label')}
            {this.nextInventoryLabel(sample)}
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

        <Row>
          <SampleDetailsSolvents
            sample={sample}
            onChange={handleSampleChanged}
          />
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
