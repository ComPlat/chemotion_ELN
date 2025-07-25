/* eslint-disable react/sort-comp */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Form, Row, Col, Button, InputGroup
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import Delta from 'quill-delta';
import MaterialGroupContainer from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroupContainer';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import Molecule from 'src/models/Molecule';
import ReactionDetailsMainProperties from 'src/apps/mydb/elements/details/reactions/ReactionDetailsMainProperties';
import ReactionDetailsPurification from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsPurification';

import QuillViewer from 'src/components/QuillViewer';
import ReactionDescriptionEditor from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDescriptionEditor';

import GeneralProcedureDnd from 'src/apps/mydb/elements/details/reactions/schemeTab/GeneralProcedureDnD';
import { rolesOptions, conditionsOptions } from 'src/components/staticDropdownOptions/options';
import OlsTreeSelect from 'src/components/OlsComponent';
import ReactionDetailsDuration from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsDuration';
import { permitOn } from 'src/components/common/uis';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import {
  convertTemperature,
  convertTime,
  convertTurnoverFrequency,
  calculateFeedstockMoles,
} from 'src/utilities/UnitsConversion';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import Component from 'src/models/Component';
import { parseNumericString } from 'src/utilities/MathUtils';

export default class ReactionDetailsScheme extends React.Component {
  constructor(props) {
    super(props);

    const textTemplate = TextTemplateStore.getState().reactionDescription;
    this.state = {
      lockEquivColumn: false,
      displayYieldField: null,
      reactionDescTemplate: textTemplate.toJS(),
    };

    this.reactQuillRef = React.createRef();
    this.additionQuillRef = React.createRef();

    this.handleTemplateChange = this.handleTemplateChange.bind(this);

    this.onReactionChange = this.onReactionChange.bind(this);
    this.onChangeRole = this.onChangeRole.bind(this);
    this.renderRole = this.renderRole.bind(this);
    this.addSampleTo = this.addSampleTo.bind(this);
    this.dropMaterial = this.dropMaterial.bind(this);
    this.dropSample = this.dropSample.bind(this);
    this.switchEquiv = this.switchEquiv.bind(this);
    this.switchYield = this.switchYield.bind(this);
    this.handleOnConditionSelect = this.handleOnConditionSelect.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);
    this.reactionVesselSize = this.reactionVesselSize.bind(this);
    this.updateVesselSize = this.updateVesselSize.bind(this);
    this.updateVesselSizeOnBlur = this.updateVesselSizeOnBlur.bind(this);
    this.changeVesselSizeUnit = this.changeVesselSizeUnit.bind(this);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.handleTemplateChange);

    TextTemplateActions.fetchTextTemplates('reaction');
    TextTemplateActions.fetchTextTemplates('reactionDescription');
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.handleTemplateChange);
    this.resetGasPhaseStore();
  }

  // eslint-disable-next-line class-methods-use-this
  updateTextTemplates(textTemplate) {
    TextTemplateActions.updateTextTemplates('reactionDescription', textTemplate);
  }

  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { reaction } = this.props;
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      // Create new Sample with counter
      splitSample = Sample.buildNew(srcSample, reaction.collection_id, tagGroup);
    } else if (srcSample instanceof Sample) {
      if (tagGroup === 'reactants' || tagGroup === 'solvents') {
        // Skip counter for reactants or solvents
        splitSample = srcSample.buildChildWithoutCounter();
        splitSample.short_label = tagGroup.slice(0, -1);
      } else {
        splitSample = srcSample.buildChild();
      }
    }
    splitSample.show_label = (splitSample.decoupled && !splitSample.molfile) ? true : splitSample.show_label;
    if (tagGroup == 'solvents') {
      splitSample.reference = false;
    }

    if (splitSample.isMixture()) {
      ComponentsFetcher.fetchComponentsBySampleId(srcSample.id)
        .then(async (components) => {
          const sampleComponents = components.map(Component.deserializeData);
          await splitSample.initialComponents(sampleComponents);
          const comp = sampleComponents.find((component) => component.amount_mol > 0 && component.molarity_value > 0);
          if (comp) {
            splitSample.target_amount_value = comp.amount_mol / comp.molarity_value;
            splitSample.target_amount_unit = 'l';
          }
          reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
          this.onReactionChange(reaction, { schemaChanged: true });
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    } else {
      this.insertSolventExtLabel(splitSample, tagGroup, extLabel);
      reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
      this.onReactionChange(reaction, { schemaChanged: true });
    }
  }

  insertSolventExtLabel(splitSample, materialGroup, externalLabel) {
    if (externalLabel && materialGroup === 'solvents' && !splitSample.external_label) {
      splitSample.external_label = externalLabel;
    }
  }

  onChangeRole(e) {
    const { onInputChange } = this.props;
    const value = e && e.value;
    onInputChange('role', value);
  }

  switchEquiv() {
    const { lockEquivColumn } = this.state;
    this.setState({ lockEquivColumn: !lockEquivColumn });
  }

  switchYield = (shouldDisplayYield) => {
    this.setState({ displayYieldField: !!shouldDisplayYield });
  };

  handleOnConditionSelect(eventKey) {
    const { reaction, onReactionChange } = this.props;
    const val = eventKey.value;
    if (reaction.conditions == null || reaction.conditions.length === 0) {
      reaction.conditions = `${val} `;
    } else {
      reaction.conditions += `\n${val} `;
    }
    onReactionChange(reaction, { schemaChanged: true });
  }

  renderGPDnD() {
    const { reaction } = this.props;
    return (
      <GeneralProcedureDnd
        reaction={reaction}
      />
    );
  }

  renderRolesOption({icon, label, variant}) {
    return (
      <>
        <i className={`fa ${icon} text-${variant} me-2`} />
        {label}
      </>
    );
  }

  renderRoleSelect() {
    const { reaction } = this.props;
    const { role } = reaction;

    return (
      <Select
        isDisabled={!permitOn(reaction)}
        name="role"
        options={rolesOptions}
        formatOptionLabel={this.renderRolesOption}
        isClearable
        value={rolesOptions.find(({value}) => value === role)}
        onChange={this.onChangeRole}
      />
    );
  }

  renderRole() {
    const { reaction } = this.props;
    const { role } = reaction;
    const isPartsRole = role === 'parts';
    let accordTo;
    if (role === 'parts') {
      accordTo = 'According to';
    }

    return (
      <Row className="d-flex align-items-center">
        <Col sm={isPartsRole ? 6 : 12}>
          <Form.Group className="flex-grow-1">
            <Form.Label>Role</Form.Label>
            {this.renderRoleSelect()}
          </Form.Group>
        </Col>
        {isPartsRole && (
          <Col sm={6}>
            <Form.Group>
              <Form.Label>{accordTo}</Form.Label>
              {this.renderGPDnD()}
            </Form.Group>
          </Col>
        )}
      </Row>
    );
  }

  deleteMaterial(material, materialGroup) {
    const { reaction } = this.props;
    reaction.deleteMaterial(material, materialGroup);

    // only reference of 'starting_materials' or 'reactants' triggers updatedReactionForReferenceChange
    // only when reaction.referenceMaterial not exist triggers updatedReactionForReferenceChange
    const referenceRelatedGroup = ['starting_materials', 'reactants'];
    if (referenceRelatedGroup.includes(materialGroup) && (!reaction.referenceMaterial)) {
      if (reaction[materialGroup].length === 0) {
        const refMaterialGroup = materialGroup === 'starting_materials' ? 'reactants' : 'starting_materials';
        if (reaction[refMaterialGroup].length > 0) {
          const event = {
            type: 'referenceChanged',
            refMaterialGroup,
            sampleID: reaction[refMaterialGroup][0].id,
            value: 'on'
          };
          this.updatedReactionForReferenceChange(event);
        }
      } else {
        const event = {
          type: 'referenceChanged',
          materialGroup,
          sampleID: reaction[materialGroup][0].id,
          value: 'on'
        };
        this.updatedReactionForReferenceChange(event);
      }
    }

    this.onReactionChange(reaction, { schemaChanged: true });
  }

  // eslint-disable-next-line class-methods-use-this
  updateDraggedMaterialGasType(reaction, srcMat, srcGroup, tagMat, tagGroup) {
    const updatedSample = reaction.sampleById(srcMat.id);
    const conditions = tagGroup === 'solvents'
    || ((srcGroup === 'reactants' || srcGroup === 'starting_materials') && tagGroup === 'products')
    || ((srcGroup === 'products') && (tagGroup === 'reactants' || tagGroup === 'starting_materials'));
    if (conditions) {
      updatedSample.gas_type = 'off';
    }
  }

  dropMaterial(srcMat, srcGroup, tagMat, tagGroup) {
    const { reaction } = this.props;
    this.updateDraggedMaterialGasType(reaction, srcMat, srcGroup, tagMat, tagGroup);
    reaction.moveMaterial(srcMat, srcGroup, tagMat, tagGroup);
    this.onReactionChange(reaction, { schemaChanged: true });
  }

  onReactionChange(reaction, options = {}) {
    this.props.onReactionChange(reaction, options);
  }

  // eslint-disable-next-line class-methods-use-this
  resetGasPhaseStore() {
    GasPhaseReactionActions.setReactionVesselSize(null);
    GasPhaseReactionActions.setCatalystReferenceMole(null);
  }

  handleTemplateChange(state) {
    this.setState({
      reactionDescTemplate: state.reactionDescription.toJS()
    });
  }

  handleMaterialsChange(changeEvent) {
    switch (changeEvent.type) {
      case 'referenceChanged':
        this.onReactionChange(
          this.updatedReactionForReferenceChange(changeEvent)
        );
        break;
      case 'showLabelChanged':
        this.onReactionChange(
          this.updatedReactionForShowLabelChange(changeEvent)
        );
        break;
      case 'amountChanged':
        this.onReactionChange(
          this.updatedReactionForAmountChange(changeEvent)
        );
        break;
      case 'amountUnitChanged':
        this.onReactionChange(
          this.updatedReactionForAmountUnitChange(changeEvent)
        );
        break;
      case 'MetricsChanged':
        this.onReactionChange(
          this.updatedReactionForMetricsChange(changeEvent)
        );
        break;
      case 'loadingChanged':
        this.onReactionChange(
          this.updatedReactionForLoadingChange(changeEvent)
        );
        break;
      case 'coefficientChanged':
        this.onReactionChange(
          this.updatedReactionForCoefficientChange(changeEvent)
        );
        break;
      case 'amountTypeChanged':
        this.onReactionChange(
          this.updatedReactionForAmountTypeChange(changeEvent)
        );
        break;
      case 'equivalentChanged':
        this.onReactionChange(
          this.updatedReactionForEquivalentChange(changeEvent)
        );
        break;
      case 'externalLabelChanged':
        this.onReactionChange(
          this.updatedReactionForExternalLabelChange(changeEvent)
        );
        break;
      case 'drysolventChanged':
        this.onReactionChange(
          this.updatedReactionForDrySolventChange(changeEvent)
        );
        break;
      case 'externalLabelCompleted':
        const { reaction } = this.props;
        this.onReactionChange(reaction, { schemaChanged: true });
        break;
      case 'addToDesc':
        this.addSampleTo(changeEvent, 'description');
        this.addSampleTo(changeEvent, 'observation');
        break;
      case 'gasType':
        this.onReactionChange(
          this.updatedReactionForGasTypeChange(changeEvent)
        );
        break;
      case 'gasFieldsChanged':
        this.onReactionChange(
          this.updatedReactionForGasProductFieldsChange(changeEvent)
        );
        break;
      case 'gasFieldsUnitsChanged':
        this.onReactionChange(
          this.updatedReactionForGasFieldsUnitsChange(changeEvent)
        );
        break;
      case 'conversionRateChanged':
        this.onReactionChange(
          this.updatedReactionForConversionRateChange(changeEvent)
        );
        break;
      default:
        break;
    }
  }

  addSampleTo(e, type) {
    const { paragraph } = e;
    let quillEditor = this.reactQuillRef.current.editor;
    if (type === 'observation') quillEditor = this.additionQuillRef.current.editor;
    const range = quillEditor.getSelection();
    if (range) {
      let contents = quillEditor.getContents();
      let insertOps = [{ insert: paragraph }];
      const insertDelta = new Delta(insertOps);
      if (range.index > 0) {
        insertOps = [{ retain: range.index }].concat(insertOps);
      }
      const elementDelta = new Delta(insertOps);
      contents = contents.compose(elementDelta);
      quillEditor.setContents(contents);
      range.length = 0;
      range.index += insertDelta.length();
      quillEditor.setSelection(range);
      this.props.onInputChange(type, new Delta(contents));
    }
  }

  updatedReactionForExternalLabelChange(changeEvent) {
    const { sampleID, externalLabel } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.external_label = externalLabel;

    return this.updatedReactionWithSample(this.updatedSamplesForExternalLabelChange.bind(this), updatedSample);
  }

  updatedReactionForDrySolventChange(changeEvent) {
    const { sampleID, dry_solvent } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.dry_solvent = dry_solvent;

    return this.updatedReactionWithSample(this.updatedSamplesForDrySolventChange.bind(this), updatedSample);
  }

  updatedReactionForReferenceChange(changeEvent) {
    const { sampleID } = changeEvent;
    const { reaction } = this.props;
    const sample = reaction.sampleById(sampleID);

    reaction.markSampleAsReference(sampleID);

    return this.updatedReactionWithSample(this.updatedSamplesForReferenceChange.bind(this), sample);
  }

  updatedReactionForShowLabelChange(changeEvent) {
    const { sampleID, value } = changeEvent;
    const { reaction } = this.props;
    const sample = reaction.sampleById(sampleID);

    reaction.toggleShowLabelForSample(sampleID);
    this.onReactionChange(reaction, { schemaChanged: true });

    return this.updatedReactionWithSample(this.updatedSamplesForShowLabelChange.bind(this), sample);
  }

  updatedReactionForAmountChange(changeEvent) {
    const { sampleID, amount } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    // normalize to milligram
    updatedSample.setAmountAndNormalizeToGram(amount);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForAmountUnitChange(changeEvent) {
    const { sampleID, amount } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);
    // normalize to milligram
    // updatedSample.setAmountAndNormalizeToGram(amount);
    // setAmount should be called first before updating feedstock mole and volume values
    updatedSample.setAmount(amount);

    if (updatedSample.gas_type === 'catalyst') {
      GasPhaseReactionActions.setCatalystReferenceMole(updatedSample.amount_mol);
    }

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForMetricsChange(changeEvent) {
    const { sampleID, metricUnit, metricPrefix } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);
    updatedSample.setUnitMetrics(metricUnit, metricPrefix);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForLoadingChange(changeEvent) {
    const { sampleID, amountType } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForAmountTypeChange(changeEvent) {
    const { sampleID, amountType } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForCoefficientChange(changeEvent) {
    const { sampleID, coefficient } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.coefficient = coefficient;
    this.updatedReactionForEquivalentChange(changeEvent);

    return this.updatedReactionWithSample(this.updatedSamplesForCoefficientChange.bind(this), updatedSample);
  }

  updatedReactionForEquivalentChange(changeEvent) {
    const { sampleID, equivalent } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.equivalent = equivalent;

    return this.updatedReactionWithSample(this.updatedSamplesForEquivalentChange.bind(this), updatedSample);
  }

  calculateEquivalentForProduct(sample, referenceMaterial, stoichiometryCoeff) {
    const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
    if (sample.gas_type === 'gas') {
      const result = this.calculateEquivalentForGasProduct(sample, vesselVolume);
      const equivalent = result > 1 ? 1 : result;
      return { ...sample, equivalent };
    }
    const numerator = referenceMaterial.amount_mol * stoichiometryCoeff * sample.molecule_molecular_weight;
    const maxAmount = numerator / (sample.purity || 1);
    let equivalent = maxAmount !== 0 ? (sample.amount_g / maxAmount) : 0;
    if (sample.amount_g > maxAmount) {
      equivalent = 1;
      this.triggerNotification(sample.decoupled);
    }
    return { ...sample, equivalent };
  }

  updatedReactionForGasTypeChange(changeEvent) {
    const {
      sampleID,
      materialGroup,
      value
    } = changeEvent;
    const { reaction } = this.props;
    let updatedSample = reaction.sampleById(sampleID);
    const isFeedstockMaterialPresent = reaction.isFeedstockMaterialPresent();
    if (materialGroup === 'products') {
      if (value === 'gas') {
        updatedSample.gas_type = 'off';
      } else {
        updatedSample.gas_type = 'gas';
      }
      if (!updatedSample.gas_phase_data) {
        updatedSample.gas_phase_data = null;
      }
      const { referenceMaterial } = reaction;
      const stoichiometryCoeff = (updatedSample.coefficient || 1.0) / (referenceMaterial?.coefficient || 1.0);
      if (referenceMaterial && stoichiometryCoeff) {
        updatedSample = this.calculateEquivalentForProduct(updatedSample, referenceMaterial, stoichiometryCoeff);
      }
    } else if (materialGroup === 'starting_materials' || materialGroup === 'reactants') {
      if (isFeedstockMaterialPresent && value === 'off') {
        updatedSample.gas_type = 'catalyst';
      } else if (value === 'FES') {
        updatedSample.gas_type = 'off';
      } else if (value === 'CAT') {
        updatedSample.gas_type = 'off';
        GasPhaseReactionActions.setCatalystReferenceMole(null);
      } else if (value === 'off' && !isFeedstockMaterialPresent) {
        updatedSample.gas_type = 'feedstock';
      } else if (value === 'off') {
        updatedSample.gas_type = 'catalyst';
      }
    }
    if (updatedSample.gas_type === 'catalyst') {
      GasPhaseReactionActions.setCatalystReferenceMole(updatedSample.amount_mol);
    }
    return this.updatedReactionWithSample(this.updatedSamplesForGasTypeChange.bind(this), updatedSample);
  }

  updatedReactionForGasProductFieldsChange(changeEvent) {
    const {
      sampleID,
      value,
      materialGroup,
      field
    } = changeEvent;
    const { reaction } = this.props;
    const updatedSample = reaction.sampleById(sampleID);
    if (materialGroup === 'products' && updatedSample.gas_type === 'gas') {
      switch (field) {
        case 'temperature':
        case 'time':
        case 'turnover_frequency':
          updatedSample.gas_phase_data[field].value = value;
          break;
        case 'turnover_number':
          updatedSample.gas_phase_data.turnover_number = value;
          break;
        case 'part_per_million':
          updatedSample.gas_phase_data.part_per_million = value;
          break;
        default:
          break;
      }
      if (field === 'temperature' || field === 'part_per_million') {
        const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
        updatedSample.amount_value = updatedSample.updateGasMoles(vesselVolume);
        const equivalent = this.calculateEquivalentForGasProduct(updatedSample);
        updatedSample.equivalent = equivalent;
        if (equivalent > 1) {
          updatedSample.equivalent = 1;
          setTimeout(() => this.triggerNotification(updatedSample.decoupled), 200);
        }
      } else if (field === 'time') {
        const gasPhaseTime = updatedSample.gas_phase_data.time;
        const tonValue = updatedSample.gas_phase_data.turnover_number;
        updatedSample.updateTONPerTimeValue(tonValue, gasPhaseTime);
      }
    }
    return this.updatedReactionWithSample(
      this.updatedSamplesForGasProductFieldsChange.bind(this),
      updatedSample,
      field
    );
  }

  updatedReactionForGasFieldsUnitsChange(changeEvent) {
    const {
      sampleID,
      unit,
      value,
      field,
    } = changeEvent;
    const { reaction } = this.props;
    const updatedSample = reaction.sampleById(sampleID);
    let convertedValues;
    if (field === 'temperature') {
      convertedValues = convertTemperature(value, unit);
    } else if (field === 'time') {
      convertedValues = convertTime(value, unit);
    } else if (field === 'turnover_frequency') {
      convertedValues = convertTurnoverFrequency(value, unit);
    }
    if (convertedValues) {
      updatedSample.gas_phase_data[field].value = convertedValues[0];
      updatedSample.gas_phase_data[field].unit = convertedValues[1];
    }

    return this.updatedReactionWithSample(
      this.updatedSamplesForGasProductFieldsChange.bind(this),
      updatedSample,
      field
    );
  }

  updatedReactionForConversionRateChange(changeEvent) {
    const { reaction } = this.props;
    const { sampleID, conversionRate } = changeEvent;
    const updatedSample = reaction.sampleById(sampleID);

    updatedSample.conversion_rate = conversionRate;
    if (conversionRate / 100 > 1) {
      NotificationActions.add({
        message: 'conversion rate cannot be more than 100%',
        level: 'warning'
      });
    }

    return this.updatedReactionWithSample(this.updatedSamplesForConversionRateChange.bind(this), updatedSample);
  }

  calculateEquivalent(refM, updatedSample) {
    if (!refM.contains_residues) {
      NotificationActions.add({
        message: 'Cannot perform calculations for loading and equivalent',
        level: 'error'
      });

      return 1.0;
    }

    if (!refM.loading) {
      NotificationActions.add({
        message: 'Please set non-zero starting material loading',
        level: 'error'
      });

      return 0.0;
    }

    let loading = refM.residues[0].custom_info.loading;
    let mass_koef = updatedSample.amount_g / refM.amount_g;
    let mwb = updatedSample.molecule.molecular_weight;
    let mwa = refM.molecule.molecular_weight;
    let mw_diff = mwb - mwa;
    let equivalent = (1000.0 / loading) * (mass_koef - 1.0) / mw_diff;

    if (equivalent < 0.0 || equivalent > 1.0 || isNaN(equivalent) || !isFinite(equivalent)) {
      equivalent = 1.0;
    }

    return equivalent;
  }

  checkMassMolecule(referenceM, updatedS) {
    let errorMsg;
    let mFull;
    const mwb = updatedS.decoupled ? (updatedS.molecular_mass || 0) : updatedS.molecule.molecular_weight;

    // mass check apply to 'polymers' only
    if (!updatedS.contains_residues) {
      mFull = referenceM.amount_mol * mwb;
      const maxTheoAmount = mFull * (updatedS.coefficient || 1.0 / referenceM.coefficient || 1.0);
      if (updatedS.amount_g > maxTheoAmount) {
        errorMsg = 'Experimental mass value is larger than possible\n' +
          'by 100% conversion! Please check your data.';
      }
    } else {
      const mwa = referenceM.decoupled ? (referenceM.molecular_mass || 0) : referenceM.molecule.molecular_weight;
      const deltaM = mwb - mwa;
      const massA = referenceM.amount_g;
      mFull = massA + (referenceM.amount_mol * deltaM);
      const massExperimental = updatedS.amount_g;

      if (deltaM > 0) { // expect weight gain
        if (massExperimental > mFull) {
          errorMsg = 'Experimental mass value is larger than possible\n' +
            'by 100% conversion! Please check your data.';
        } else if (massExperimental < massA) {
          errorMsg = 'Material loss! ' +
            'Experimental mass value is less than possible!\n' +
            'Please check your data.';
        }
      } else if (massExperimental < mFull) { // expect weight loss
        errorMsg = 'Experimental mass value is less than possible\n' +
          'by 100% conversion! Please check your data.';
      }
    }

    updatedS.maxAmount = mFull;

    if (errorMsg && !updatedS.decoupled) {
      updatedS.error_mass = true;
      NotificationActions.add({
        message: errorMsg,
        level: 'error',
      });
    } else {
      updatedS.error_mass = false;
    }

    return { mFull, errorMsg };
  }

  checkMassPolymer(referenceM, updatedS, massAnalyses) {
    const equivalent = this.calculateEquivalent(referenceM, updatedS);
    updatedS.equivalent = equivalent;
    let fconv_loading = referenceM.amount_mol / updatedS.amount_g * 1000.0;
    updatedS.residues[0].custom_info['loading_full_conv'] = fconv_loading;
    updatedS.residues[0].custom_info['loading_type'] = 'mass_diff';

    let newAmountMol;

    if (equivalent < 0.0 || equivalent > 1.0) {
      updatedS.adjusted_equivalent = equivalent > 1.0 ? 1.0 : 0.0;
      updatedS.adjusted_amount_mol = referenceM.amount_mol;
      updatedS.adjusted_loading = fconv_loading;
      updatedS.adjusted_amount_g = updatedS.amount_g;
      newAmountMol = referenceM.amount_mol;
    }

    newAmountMol = referenceM.amount_mol * equivalent;
    const newLoading = (newAmountMol / updatedS.amount_g) * 1000.0;

    updatedS.residues[0].custom_info.loading = newLoading;
  }

  // eslint-disable-next-line class-methods-use-this
  triggerNotification(isDecoupled) {
    if (!isDecoupled) {
      const errorMsg = 'Experimental mass value is larger than possible\n'
        + 'by 100% conversion! Please check your data.';
      NotificationActions.add({
        message: errorMsg,
        level: 'error',
      });
    }
  }

  updatedSamplesForAmountChange(samples, updatedSample, materialGroup) {
    const { reaction: { referenceMaterial } } = this.props;
    const { lockEquivColumn } = this.state;
    const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
    let stoichiometryCoeff = 1.0;

    return samples.map((sample) => {
      stoichiometryCoeff = (sample.coefficient || 1.0) / (referenceMaterial?.coefficient || 1.0);
      if (referenceMaterial) {
        if (sample.id === updatedSample.id) {
          if (!updatedSample.reference && referenceMaterial.amount_value) {
            if (materialGroup === 'products') {
              if (updatedSample.contains_residues && updatedSample.gas_type !== 'gas') {
                const massAnalyses = this.checkMassMolecule(referenceMaterial, updatedSample);
                this.checkMassPolymer(referenceMaterial, updatedSample, massAnalyses);
                return sample;
              }
              sample.maxAmount = referenceMaterial.amount_mol * stoichiometryCoeff * sample.molecule_molecular_weight / (sample.purity || 1);
              // yield taking into account stoichiometry:
              if (updatedSample.gas_type === 'gas') {
                const equivalent = this.calculateEquivalentForGasProduct(sample, vesselVolume);
                sample.equivalent = equivalent > 1 ? 1 : equivalent;
              } else if (!lockEquivColumn) {
                sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol / stoichiometryCoeff;
              }
            } else {
              if (!lockEquivColumn) {
                sample.equivalent = sample.amount_g / sample.maxAmount;
              } else {
                if (referenceMaterial && referenceMaterial.amount_value && updatedSample.gas_type !== 'feedstock') {
                  sample.setAmountAndNormalizeToGram({
                    value: sample.equivalent * referenceMaterial.amount_mol,
                    unit: 'mol',
                  });
                } else if (sample.amount_value && updatedSample.gas_type !== 'feedstock') {
                  sample.setAmountAndNormalizeToGram({
                    value: sample.equivalent * sample.amount_mol,
                    unit: 'mol'
                  });
                }
              }
            }
          } else {
            if (materialGroup === 'products' && sample.gas_type !== 'gas') {
              sample.equivalent = 0.0;
            } else if (!lockEquivColumn) {
              sample.equivalent = 1.0;
            }
          }
        } else {
          if ((!lockEquivColumn || materialGroup === 'products') && sample.gas_type !== 'gas') {
            // calculate equivalent, don't touch real amount
            sample.maxAmount = referenceMaterial.amount_mol * stoichiometryCoeff * sample.molecule_molecular_weight / (sample.purity || 1);
            // yield taking into account stoichiometry:
            sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol / stoichiometryCoeff;
          } else {
            //sample.amount_mol = sample.equivalent * referenceMaterial.amount_mol;
            if (referenceMaterial && referenceMaterial.amount_value && updatedSample.gas_type !== 'feedstock' && sample.gas_type !== 'gas') {
              sample.setAmountAndNormalizeToGram({
                value: sample.equivalent * referenceMaterial.amount_mol,
                unit: 'mol',
              });
            }
          }
        }

        if ((materialGroup === 'starting_materials' || materialGroup === 'reactants') && !sample.reference && !lockEquivColumn) {
          // eslint-disable-next-line no-param-reassign
          sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
        } else if (materialGroup === 'products'
          && (sample.equivalent < 0.0 || isNaN(sample.equivalent) || !isFinite(sample.equivalent))
          && sample.gas_type !== 'gas') {
          // if (materialGroup === 'products' && (sample.equivalent < 0.0 || sample.equivalent > 1.0 || isNaN(sample.equivalent) || !isFinite(sample.equivalent))) {
          // eslint-disable-next-line no-param-reassign
          sample.equivalent = 1.0;
        } else if ((materialGroup === 'products' && (sample.amount_mol === 0 || referenceMaterial.amount_mol === 0)
          && sample.gas_type !== 'gas')) {
          // eslint-disable-next-line no-param-reassign
          sample.equivalent = 0.0;
        } else if (materialGroup === 'products' && sample.amount_g > sample.maxAmount && sample.gas_type !== 'gas') {
          // eslint-disable-next-line no-param-reassign
          sample.equivalent = 1;
          this.triggerNotification(sample.decoupled);
        }
      }

      if (materialGroup === 'products') {
        if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
          sample.maxAmount = referenceMaterial.amount_mol * stoichiometryCoeff * sample.molecule_molecular_weight / (sample.purity || 1);
        }
      }
      return sample;
    });
  }

  calculateEquivalentForGasProduct(sample, reactionVesselSize = null) {
    const { reaction } = this.props;
    const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
    const volume = reactionVesselSize || vesselVolume;
    const refMaterial = reaction.findFeedstockMaterial();
    if (!refMaterial || !volume) {
      return null;
    }
    const { purity } = refMaterial;
    const feedstockMolValue = calculateFeedstockMoles(volume, purity || 1);
    return (sample.amount_mol / feedstockMolValue);
  }

  updatedSamplesForEquivalentChange(samples, updatedSample, materialGroup) {
    const { reaction: { referenceMaterial } } = this.props;
    let stoichiometryCoeff = 1.0;
    return samples.map((sample) => {
      stoichiometryCoeff = (sample.coefficient || 1.0) / (referenceMaterial?.coefficient || 1.0);
      if (sample.id === updatedSample.id && updatedSample.equivalent) {
        sample.equivalent = updatedSample.equivalent;
        if (referenceMaterial && referenceMaterial.amount_value
          && updatedSample.gas_type !== 'feedstock') {
          sample.setAmountAndNormalizeToGram({
            value: updatedSample.equivalent * referenceMaterial.amount_mol,
            unit: 'mol',
          });
        } else if (sample.amount_value && updatedSample.gas_type !== 'feedstock') {
          sample.setAmountAndNormalizeToGram({
            value: updatedSample.equivalent * sample.amount_mol,
            unit: 'mol'
          });
        }
      }
      if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
        /* eslint-disable no-param-reassign, no-unused-expressions */
        if (materialGroup === 'products') {
          sample = this.calculateEquivalentForProduct(sample, referenceMaterial, stoichiometryCoeff);
        } else {
          // NB: sample equivalent independant of coeff
          if (sample.reference) {
            sample.equivalent = sample.reference ? 1 : 0;
          } else {
            sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
          }
        }
      }
      return sample;
    });
  }

  updatedSamplesForExternalLabelChange(samples, updatedSample) {
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        sample.external_label = updatedSample.external_label;
      }
      return sample;
    });
  }

  updatedSamplesForDrySolventChange(samples, updatedSample) {
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        sample.dry_solvent = updatedSample.dry_solvent;
      }
      return sample;
    });
  }

  updatedSamplesForShowLabelChange(samples) {
    return samples;
  }

  /* eslint-disable class-methods-use-this, no-param-reassign */
  updatedSamplesForCoefficientChange(samples, updatedSample) {
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        // set sampple.coefficient to default value, if user set coeff. value to zero
        if (updatedSample.coefficient % 1 !== 0 || updatedSample.coefficient === 0) {
          updatedSample.coefficient = 1;
          sample.coefficient = updatedSample.coefficient;
          NotificationActions.add({
            message: 'The sample coefficient should be a positive integer',
            level: 'error'
          });
        } else {
          sample.coefficient = updatedSample.coefficient;
        }
        const rId = sample.belongTo ? sample.belongTo.id : null;
        ElementActions.setRefreshCoefficient(sample.id, sample.coefficient, rId);
      }
      return sample;
    });
  }

  updatedSamplesForReferenceChange(samples, referenceMaterial, materialGroup) {
    return samples.map((sample) => {
      if (sample.id === referenceMaterial.id) {
        sample.equivalent = 1.0;
        sample.reference = true;
      } else {
        if (sample.amount_value) {
          const referenceAmount = referenceMaterial.amount_mol;
          if (referenceMaterial && referenceAmount) {
            if (materialGroup === 'products') {
              sample.equivalent = sample.amount_mol * (referenceMaterial.coefficient || 1) / (referenceAmount * (sample.coefficient || 1));
            } else {
              sample.equivalent = sample.amount_mol / referenceAmount;
            }
          }
        }
        sample.reference = false;
      }
      return sample;
    });
  }

  updatedSamplesForGasTypeChange(samples, updatedSample) {
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        sample.gas_type = updatedSample.gas_type;
        sample.equivalent = updatedSample.equivalent;
      } else if (sample.id !== updatedSample.id) {
        if ((updatedSample.gas_type === 'feedstock' && sample.gas_type === 'feedstock')
        || (updatedSample.gas_type === 'catalyst' && sample.gas_type === 'catalyst')) {
          sample.gas_type = 'off';
        }
        if (sample.gas_type === 'gas') {
          const equivalent = this.calculateEquivalentForGasProduct(sample);
          sample.equivalent = equivalent;
        }
      }
      return sample;
    });
  }

  updatedSamplesForGasProductFieldsChange(samples, updatedSample, MaterialGroup, field) {
    if (MaterialGroup !== 'products') return samples;

    return samples.map((sample) => {
      if (sample.id !== updatedSample.id) return sample;
      const updatedGasPhaseData = { ...sample.gas_phase_data };
      switch (field) {
        case 'temperature':
        case 'time':
        case 'turnover_frequency':
          updatedGasPhaseData[field] = {
            value: updatedSample.gas_phase_data[field].value,
            unit: updatedSample.gas_phase_data[field].unit
          };
          break;
        case 'turnover_number':
          updatedGasPhaseData.turnover_number = updatedSample.gas_phase_data[field];
          break;
        case 'part_per_million':
          updatedGasPhaseData.part_per_million = updatedSample.gas_phase_data[field];
          break;
        default:
          break;
      }

      if (field === 'temperature' || field === 'part_per_million') {
        sample.equivalent = updatedSample.equivalent;
      }
      return {
        ...sample,
        gas_phase_data: updatedGasPhaseData
      };
    });
  }

  updatedSamplesForConversionRateChange(samples, updatedSample) {
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        sample.conversion_rate = updatedSample.conversion_rate;
      }
      return sample;
    });
  }

  updatedReactionWithSample(updateFunction, updatedSample, type) {
    const { reaction } = this.props;
    reaction.starting_materials = updateFunction(reaction.starting_materials, updatedSample, 'starting_materials', type);
    reaction.reactants = updateFunction(reaction.reactants, updatedSample, 'reactants', type);
    reaction.solvents = updateFunction(reaction.solvents, updatedSample, 'solvents', type);
    reaction.products = updateFunction(reaction.products, updatedSample, 'products', type);
    return reaction;
  }

  updateVesselSize(e) {
    const { onInputChange } = this.props;
    const { value } = e.target;
    onInputChange('vesselSizeAmount', value);
  }

  updateVesselSizeOnBlur(e) {
    const { onInputChange } = this.props;
    const { value } = e.target;
    const newValue = parseNumericString(value);
    onInputChange('vesselSizeAmount', newValue);
  }

  changeVesselSizeUnit() {
    const { onInputChange, reaction } = this.props;
    if (reaction.vessel_size.unit === 'ml') {
      onInputChange('vesselSizeUnit', 'l');
    } else if (reaction.vessel_size.unit === 'l') {
      onInputChange('vesselSizeUnit', 'ml');
    }
  }

  reactionVesselSize() {
    const { reaction } = this.props;
    return (
      <Form.Group>
        <Form.Label>Vessel size</Form.Label>
        <InputGroup>
          <Form.Control
            name="reaction_vessel_size"
            type="text"
            value={reaction.vessel_size?.amount || ''}
            disabled={false}
            onChange={(event) => this.updateVesselSize(event)}
            onBlur={(event) => this.updateVesselSizeOnBlur(event, reaction.vessel_size.unit)}
            className="flex-grow-1 Select-control"
          />
          <Button
            disabled={false}
            variant="primary"
            onClick={() => this.changeVesselSizeUnit()}
          >
            {reaction.vessel_size?.unit || 'ml'}
          </Button>
        </InputGroup>
      </Form.Group>
    );
  }

  render() {
    const {
      lockEquivColumn,
      reactionDescTemplate,
      displayYieldField,
    } = this.state;
    const { reaction } = this.props;
    if (reaction.editedSample !== undefined) {
      if (reaction.editedSample.amountType === 'target') {
        this.updatedSamplesForEquivalentChange(reaction.samples, reaction.editedSample);
      } else { // real amount, so that we update amount in mmol
        this.updatedSamplesForAmountChange(reaction.samples, reaction.editedSample);
      }
      reaction.editedSample = undefined;
    } else {
      const { referenceMaterial } = reaction;
      reaction.products.map((sample) => {
        sample.concn = sample.amount_mol / reaction.solventVolume;
        if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
          if (sample.contains_residues) {
            sample.maxAmount = referenceMaterial.amount_g + (referenceMaterial.amount_mol
              * (sample.molecule.molecular_weight - referenceMaterial.molecule.molecular_weight));
          }
        }
      });
    }

    if ((typeof (lockEquivColumn) !== 'undefined' && !lockEquivColumn) || !reaction.changed) {
      reaction.starting_materials.map((sample) => {
        sample.concn = sample.amount_mol / reaction.solventVolume;
      });
      reaction.reactants.map((sample) => {
        sample.concn = sample.amount_mol / reaction.solventVolume;
      });
    }

    // if no reference material then mark first starting material
    const refM = reaction.starting_materials[0];
    if (!reaction.referenceMaterial && refM) {
      reaction.markSampleAsReference(refM.id);
    }

    if (displayYieldField === null) {
      const allHaveNoConversion = reaction.products.every(
        (material) => !(material.conversion_rate && material.conversion_rate !== 0)
      );
      this.switchYield(allHaveNoConversion);
    }

    const headReactants = reaction.starting_materials.length ?? 0;
    return (
      <>
        <div>
          <div className="border-bottom">
            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="starting_materials"
              materials={reaction.starting_materials}
              dropMaterial={this.dropMaterial}
              deleteMaterial={
                (material, materialGroup) => this.deleteMaterial(material, materialGroup)
              }
              dropSample={this.dropSample}
              showLoadingColumn={!!reaction.hasPolymers()}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
              switchEquiv={this.switchEquiv}
              lockEquivColumn={this.state.lockEquivColumn}
              headIndex={0}
            />
          </div>

          <div className="border-bottom">
            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="reactants"
              materials={reaction.reactants}
              dropMaterial={this.dropMaterial}
              deleteMaterial={
                (material, materialGroup) => this.deleteMaterial(material, materialGroup)
              }
              dropSample={this.dropSample}
              showLoadingColumn={!!reaction.hasPolymers()}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
              switchEquiv={this.switchEquiv}
              lockEquivColumn={lockEquivColumn}
              headIndex={headReactants}
            />
          </div>
          <div className="mb-3">
            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="products"
              materials={reaction.products}
              dropMaterial={this.dropMaterial}
              deleteMaterial={
                (material, materialGroup) => this.deleteMaterial(material, materialGroup)
              }
              dropSample={this.dropSample}
              showLoadingColumn={!!reaction.hasPolymers()}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
              switchEquiv={this.switchEquiv}
              lockEquivColumn={this.state.lockEquivColumn}
              switchYield={this.switchYield}
              displayYieldField={displayYieldField}
              headIndex={0}
            />
          </div>

          <Accordion
            alwaysOpen
            defaultActiveKey={['solvents']}
          >
            <Accordion.Item eventKey="solvents">
              <Accordion.Header>Solvents</Accordion.Header>
              <Accordion.Body>
                <MaterialGroupContainer
                  reaction={reaction}
                  materialGroup="solvents"
                  materials={reaction.solvents}
                  dropMaterial={this.dropMaterial}
                  deleteMaterial={
                    (material, materialGroup) => this.deleteMaterial(material, materialGroup)
                  }
                  dropSample={this.dropSample}
                  showLoadingColumn={!!reaction.hasPolymers()}
                  onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
                  switchEquiv={this.switchEquiv}
                  lockEquivColumn={this.state.lockEquivColumn}
                  headIndex={0}
                />
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="conditions">
              <Accordion.Header>Conditions</Accordion.Header>
              <Accordion.Body>
                <Select
                  disabled={!permitOn(reaction)}
                  name="default_conditions"
                  multi={false}
                  options={conditionsOptions}
                  onChange={this.handleOnConditionSelect}
                />
                <Form.Control
                  as="textarea"
                  className="mt-2"
                  rows="4"
                  value={reaction.conditions || ''}
                  disabled={!permitOn(reaction) || reaction.isMethodDisabled('conditions')}
                  placeholder="Conditions..."
                  onChange={(event) => this.props.onInputChange('conditions', event)}
                />
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </div>

        <ReactionDetailsMainProperties
          reaction={reaction}
          onInputChange={(type, event) => this.props.onInputChange(type, event)}
        />
        <ReactionDetailsDuration
          reaction={reaction}
          onInputChange={(type, event) => this.props.onInputChange(type, event)}
        />
        <Row className="mb-3">
          <Col sm={4}>
            <Form.Group className="">
              <Form.Label className="text-nowrap">Type (Name Reaction Ontology)</Form.Label>
              <OlsTreeSelect
                selectName="rxno"
                selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
                onSelectChange={(event) => this.props.onInputChange('rxno', event.trim())}
                selectedDisable={!permitOn(reaction) || reaction.isMethodDisabled('rxno')}
              />
            </Form.Group>
          </Col>
          <Col sm={4}>
            {this.renderRole()}
          </Col>
          <Col sm={4}>
            {this.reactionVesselSize()}
          </Col>
        </Row>
        <Row className="mb-3">
          <Form.Group>
            <Form.Label>Description</Form.Label>
            <div>
              {
                permitOn(reaction)
                  ? (
                    <ReactionDescriptionEditor
                      height="100%"
                      reactQuillRef={this.reactQuillRef}
                      template={reactionDescTemplate}
                      value={reaction.description}
                      updateTextTemplates={this.updateTextTemplates}
                      onChange={(event) => this.props.onInputChange('description', event)}
                    />
                  ) : <QuillViewer value={reaction.description} />
              }
            </div>
          </Form.Group>
        </Row>
        <ReactionDetailsPurification
          reaction={reaction}
          onReactionChange={(r) => this.onReactionChange(r)}
          onInputChange={(type, event) => this.props.onInputChange(type, event)}
          additionQuillRef={this.additionQuillRef}
          onChange={(event) => this.handleMaterialsChange(event)}
        />
      </>
    );
  }
}

ReactionDetailsScheme.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired
};
