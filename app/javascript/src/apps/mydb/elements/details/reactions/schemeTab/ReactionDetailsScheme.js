/* eslint-disable react/sort-comp */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Form, Row, Col, Button, InputGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import Delta from 'quill-delta';
import MaterialGroup from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import Molecule from 'src/models/Molecule';
import { isSbmmSample } from 'src/utilities/ElementUtils';
import ReactionDetailsMainProperties from 'src/apps/mydb/elements/details/reactions/ReactionDetailsMainProperties';
import ReactionDetailsPurification from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsPurification';
import ReactionConditions from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionConditions';

import QuillViewer from 'src/components/QuillViewer';
import ReactionDescriptionEditor from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDescriptionEditor';

import GeneralProcedureDnd from 'src/apps/mydb/elements/details/reactions/schemeTab/GeneralProcedureDnD';
import { rolesOptions } from 'src/components/staticDropdownOptions/options';
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
  calculateGasMoles,
  convertTemperatureToKelvin,
} from 'src/utilities/UnitsConversion';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import Component from 'src/models/Component';
import { parseNumericString } from 'src/utilities/MathUtils';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';
import WeightPercentageReactionStore from 'src/stores/alt/stores/WeightPercentageReactionStore';
import { convertUnits } from 'src/components/staticDropdownOptions/units';

export default class ReactionDetailsScheme extends React.Component {
  constructor(props) {
    super(props);

    const textTemplate = TextTemplateStore.getState().reactionDescription;
    const { reaction } = props;
    const lockEquivColumn = this.getReactionEquivLockState(reaction);

    this.state = {
      lockEquivColumn,
      displayYieldField: null,
      reactionDescTemplate: textTemplate.toJS(),
    };

    this.reactQuillRef = React.createRef();
    this.additionQuillRef = React.createRef();

    this.handleTemplateChange = this.handleTemplateChange.bind(this);

    this.onChangeRole = this.onChangeRole.bind(this);
    this.renderRole = this.renderRole.bind(this);
    this.addSampleTo = this.addSampleTo.bind(this);
    this.dropMaterial = this.dropMaterial.bind(this);
    this.dropSample = this.dropSample.bind(this);
    this.dropSbmmSample = this.dropSbmmSample.bind(this);
    this.switchEquiv = this.switchEquiv.bind(this);
    this.switchYield = this.switchYield.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);
    this.reactionVesselSize = this.reactionVesselSize.bind(this);
    this.updateVesselSize = this.updateVesselSize.bind(this);
    this.updateVesselSizeOnBlur = this.updateVesselSizeOnBlur.bind(this);
    this.changeVesselSizeUnit = this.changeVesselSizeUnit.bind(this);
    this.reactionVolume = this.reactionVolume.bind(this);
    this.updateVolume = this.updateVolume.bind(this);
    this.handleVolumeCheckboxChange = this.handleVolumeCheckboxChange.bind(this);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.handleTemplateChange);
    TextTemplateActions.fetchTextTemplates('reaction');
    TextTemplateActions.fetchTextTemplates('reactionDescription');

    // Deserialize components for any existing samples in the reaction
    this.deserializeReactionMaterialComponents();
  }

  componentDidUpdate(prevProps) {
    const { reaction } = this.props;
    // Deserialize components when reaction data changes (e.g., after save/reload)
    if (prevProps.reaction !== reaction) {
      this.deserializeReactionMaterialComponents();
      // Update lock state when reaction changes
      const lockEquivColumn = this.getReactionEquivLockState(reaction);
      this.setState({ lockEquivColumn });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  deserializeReactionMaterialComponents() {
    const { reaction } = this.props;

    // Helper function to deserialize components in a materials array
    const deserializeComponentsInMaterials = (materials) => {
      materials.forEach((sample) => {
        if (sample.components && Array.isArray(sample.components) && sample.components.length > 0) {
          // Check if components need deserialization (have component_properties)
          const needsDeserialization = sample.components.some((comp) => comp.component_properties);
          if (needsDeserialization) {
            sample.components = sample.components.map(Component.deserializeData);
          }
        }
      });
    };

    // Deserialize components for all material groups
    deserializeComponentsInMaterials(reaction.starting_materials || []);
    deserializeComponentsInMaterials(reaction.reactants || []);
    deserializeComponentsInMaterials(reaction.products || []);
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
    const { reaction, onReactionChange } = this.props;
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

    // Solvents are never reference materials
    if (tagGroup === 'solvents') {
      splitSample.reference = false;
      splitSample.weight_percentage_reference = false;
    }

    if (splitSample.isMixture()) {
      ComponentsFetcher.fetchComponentsBySampleId(srcSample.id)
        .then(async (components) => {
          const sampleComponents = components.map(Component.deserializeData);
          await splitSample.initialComponents(sampleComponents);

          // Set equivalent for mixture relative to reference material
          this.setEquivalentForMixture(splitSample, tagGroup);

          reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
          onReactionChange(reaction, { updateGraphic: true });
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    } else {
      this.insertSolventExtLabel(splitSample, tagGroup, extLabel);
      reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
      onReactionChange(reaction, { updateGraphic: true });
    }
  }

  insertSolventExtLabel(splitSample, materialGroup, externalLabel) {
    if (externalLabel && materialGroup === 'solvents' && !splitSample.external_label) {
      splitSample.external_label = externalLabel;
    }
  }

  /**
   * Sets a dropped SBMM sample as the reaction reference and ensures Eq=1,
   * but only when the reaction has no reference material yet.
   */
  setReferenceAndEquivalentForSbmmSample(splitSbmmSample) {
    const { reaction } = this.props;

    if (reaction.referenceMaterial) return;

    this.updatedReactionForReferenceChange(
      {
        sampleID: splitSbmmSample.id,
        isSbmm: true
      },
      'referenceChanged'
    );
  }

  dropSbmmSample(srcSbmmSample, tagMaterial) {
    const { reaction, onReactionChange } = this.props;

    // Create a split copy (like buildChildWithoutCounter for samples)
    const splitSbmmSample = srcSbmmSample.buildChildWithoutCounter();

    // Calculate concentration_rt if amount_mol and volume are available
    // This ensures the Conc field displays the correct value
    if (splitSbmmSample.base_amount_as_used_mol_value && splitSbmmSample.base_volume_as_used_value) {
      splitSbmmSample.calculateConcentrationRt();
    }

    // Set reaction-specific properties
    splitSbmmSample.show_label = true; // Similar to how samples handle decoupled

    // Check if already in the group (by original ID or short_label)
    const isAlreadyAdded = reaction.reactant_sbmm_samples?.some(
      (s) => s.id === splitSbmmSample.id
        || (s.parent_id === srcSbmmSample.id && s.short_label === splitSbmmSample.short_label)
    );

    if (isAlreadyAdded) {
      NotificationActions.add({
        title: 'SBMM sample already added',
        message: `${srcSbmmSample.name} is already in this reaction.`,
        level: 'warning'
      });
      return;
    }

    // Add the SPLIT copy to reaction's reactant_sbmm_samples array
    reaction.addMaterialAt(splitSbmmSample, null, tagMaterial, 'reactant_sbmm_samples');

    // If no reference material exists, set dropped SBMM as reference (Eq=1).
    this.setReferenceAndEquivalentForSbmmSample(splitSbmmSample);

    // Mark reaction as changed and update max amounts
    // handleReactionChange will also set reaction.changed = true and update state
    reaction.changed = true;
    reaction.updateMaxAmountOfProducts();

    // onReactionChange will update state and trigger re-render
    // This will cause the Save button to appear when reaction.changed is true
    onReactionChange(reaction, { updateGraphic: true });

    // The split SBMM sample is created and join record is created automatically
    // when reaction is saved through the normal UpdateMaterials usecase
  }

  onChangeRole(e) {
    const { onInputChange } = this.props;
    const value = e && e.value;
    onInputChange('role', value);
  }

  switchEquiv() {
    const { reaction } = this.props;
    const currentLockState = this.getReactionEquivLockState(reaction);
    const newLockState = !currentLockState;
    ComponentActions.toggleReactionEquivLock(newLockState, reaction.id);
    // Also update local state for UI rendering
    this.setState({ lockEquivColumn: newLockState });
  }

  switchYield = (shouldDisplayYield) => {
    this.setState({ displayYieldField: !!shouldDisplayYield });
  };

  /**
   * Gets the current lock state for the reaction's equivalent column from ComponentStore.
   * @param {Reaction} reaction - The reaction object
   * @returns {boolean} The lock state for the reaction's equivalent column
   */
  // eslint-disable-next-line class-methods-use-this
  getReactionEquivLockState(reaction) {
    if (!reaction || !reaction.id) {
      return false;
    }
    const componentState = ComponentStore.getState();
    return ComponentStore.getLockStateForReaction(componentState, reaction.id);
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
    const { reaction, onReactionChange } = this.props;

    // Check if this is an SBMM sample and delete from the correct array
    if (materialGroup === 'reactants' && isSbmmSample(material)) {
      reaction.deleteMaterial(material, 'reactant_sbmm_samples');
    } else {
      reaction.deleteMaterial(material, materialGroup);
    }

    // only reference of 'starting_materials' or 'reactants' triggers updatedReactionForReferenceChange
    // only when no reference material exists (regular or SBMM) triggers updatedReactionForReferenceChange
    const referenceRelatedGroup = ['starting_materials', 'reactants'];
    if (referenceRelatedGroup.includes(materialGroup) && (!reaction.referenceMaterial)) {
      // Determine which array to use: reactants may include SBMM samples, so use reactantsWithSbmm
      const materialsArray = materialGroup === 'reactants'
        ? reaction.reactantsWithSbmm
        : reaction[materialGroup];

      if (materialsArray.length === 0) {
        // No materials left in the deleted group, try to set reference from the other group
        const refMaterialGroup = materialGroup === 'starting_materials' ? 'reactants' : 'starting_materials';
        // When looking for alternative reference in 'reactants', use reactantsWithSbmm
        const refMaterialsArray = refMaterialGroup === 'reactants'
          ? reaction.reactantsWithSbmm
          : reaction[refMaterialGroup];
        if (refMaterialsArray.length > 0) {
          const nextReferenceSample = refMaterialsArray[0];
          const event = {
            type: 'referenceChanged',
            refMaterialGroup,
            sampleID: nextReferenceSample.id,
            isSbmm: isSbmmSample(nextReferenceSample),
            value: 'on'
          };
          this.updatedReactionForReferenceChange(event);
        }
      } else {
        // Materials remain in this group, set the first one as reference
        const nextReferenceSample = materialsArray[0];
        const event = {
          type: 'referenceChanged',
          materialGroup,
          sampleID: nextReferenceSample.id,
          isSbmm: isSbmmSample(nextReferenceSample),
          value: 'on'
        };
        this.updatedReactionForReferenceChange(event);
      }
    }

    if (reaction.gaseous && material.isCatalyst()) {
      GasPhaseReactionActions.setCatalystReferenceMole(null);
      this.updatedReactionForCatalystDeletion();
    }

    onReactionChange(reaction, { updateGraphic: true });
  }

  updateDraggedMaterialGasType(reaction, srcMat, srcGroup, tagMat, tagGroup) {
    const updatedSample = this.findReactionSample(srcMat.id, isSbmmSample(srcMat));
    const conditions = tagGroup === 'solvents'
    || ((srcGroup === 'reactants' || srcGroup === 'starting_materials') && tagGroup === 'products')
    || ((srcGroup === 'products') && (tagGroup === 'reactants' || tagGroup === 'starting_materials'));
    if (conditions) {
      updatedSample.gas_type = 'off';
    }
  }

  /**
   * Maps UI group names to storage arrays. SBMM samples shown as 'reactants'
   * are actually stored in 'reactant_sbmm_samples'. Without this translation,
   * repositioning fails because indexOf returns -1, causing duplicates.
   */
  // eslint-disable-next-line class-methods-use-this
  translateMaterialGroupForStorage(material, groupName) {
    if (groupName === 'reactants' && isSbmmSample(material)) {
      return 'reactant_sbmm_samples';
    }
    return groupName;
  }

  dropMaterial(srcMat, srcGroup, tagMat, tagGroup) {
    const { reaction, onReactionChange } = this.props;
    this.updateDraggedMaterialGasType(reaction, srcMat, srcGroup, tagMat, tagGroup);

    // Translate UI group names to actual storage arrays for SBMM samples
    const actualSrcGroup = this.translateMaterialGroupForStorage(srcMat, srcGroup);
    const actualTagGroup = this.translateMaterialGroupForStorage(tagMat, tagGroup);

    reaction.moveMaterial(srcMat, actualSrcGroup, tagMat, actualTagGroup);
    onReactionChange(reaction, { updateGraphic: true });
  }

  // eslint-disable-next-line class-methods-use-this
  resetGasPhaseStore() {
    GasPhaseReactionActions.setReactionVesselSize(null);
    GasPhaseReactionActions.setCatalystReferenceMole(null);
  }

  handleTemplateChange(state) {
    const desc = state.reactionDescription;
    this.setState({
      reactionDescTemplate: desc?.toJS ? desc.toJS() : desc
    });
  }

  /**
   * Updates reaction materials based on weight percentage calculations.
   *
   * This method recalculates the amounts of all starting materials, reactants, and yield for products
   * when weight percentage mode is enabled and a target amount is set for the product weight percentage reference.
   *
   * Workflow:
   * 1. Retrieves the target amount from WeightPercentageReactionStore
   * 2. Validates that target amount exists and has a positive value
   * 3. Updates starting materials and reactants by calling calculateAmountBasedOnWeightPercentage()
   *    which sets their amount_g = targetAmount.value * weight_percentage
   * 4. Updates products by calling updateYieldForWeightPercentageReference()
   *    which recalculates yield/equivalent based on target vs actual amounts
   *
   * Guard clauses:
   * - Returns early if targetAmount is missing, null, or <= 0
   * - Individual sample methods handle their own validation
   *
   * Side effects:
   * - Mutates sample amounts and equivalents in the reaction object
   * - Triggered by weight percentage field changes or target amount updates
   *
   * @returns {void}
   */
  updateReactionMaterials() {
    const { reaction } = this.props;
    const { targetAmount } = WeightPercentageReactionStore.getState();

    if (!targetAmount || targetAmount.value == null || targetAmount.unit == null) return;

    [...reaction.starting_materials, ...reaction.reactants].forEach((sample) => {
      sample.calculateAmountBasedOnWeightPercentage(targetAmount);
    });
    [...reaction.products].forEach((sample) => {
      sample.updateYieldForWeightPercentageReference();
    });
  }

  handleMaterialsChange(changeEvent) {
    const { onReactionChange } = this.props;

    switch (changeEvent.type) {
      case 'referenceChanged':
      case 'weightPercentageReferenceChanged':
        onReactionChange(
          this.updatedReactionForReferenceChange(changeEvent, changeEvent.type)
        );
        break;
      case 'amountChanged':
        onReactionChange(
          this.updatedReactionForAmountChange(changeEvent)
        );
        break;
      case 'amountUnitChanged':
        onReactionChange(
          this.updatedReactionForAmountUnitChange(changeEvent)
        );
        break;
      case 'MetricsChanged':
        onReactionChange(
          this.updatedReactionForMetricsChange(changeEvent)
        );
        break;
      case 'loadingChanged':
        onReactionChange(
          this.updatedReactionForLoadingChange(changeEvent)
        );
        break;
      case 'coefficientChanged':
        onReactionChange(
          this.updatedReactionForCoefficientChange(changeEvent)
        );
        break;
      case 'amountTypeChanged':
        onReactionChange(
          this.updatedReactionForAmountTypeChange(changeEvent)
        );
        break;
      case 'equivalentChanged':
        onReactionChange(
          this.updatedReactionForEquivalentChange(changeEvent)
        );
        break;
      case 'weightPercentageChanged':
        onReactionChange(
          this.updatedReactionForWeightPercentageChange(changeEvent)
        );
        break;
      case 'externalLabelChanged':
        onReactionChange(
          this.updatedReactionForExternalLabelChange(changeEvent)
        );
        break;
      case 'drysolventChanged':
        onReactionChange(
          this.updatedReactionForDrySolventChange(changeEvent)
        );
        break;
      case 'externalLabelCompleted':
        const { reaction } = this.props;
        onReactionChange(reaction, { updateGraphic: true });
        break;
      case 'addToDesc':
        this.addSampleTo(changeEvent, 'description');
        this.addSampleTo(changeEvent, 'observation');
        break;
      case 'gasType':
        onReactionChange(
          this.updatedReactionForGasTypeChange(changeEvent)
        );
        break;
      case 'gasFieldsChanged':
        onReactionChange(
          this.updatedReactionForGasProductFieldsChange(changeEvent)
        );
        break;
      case 'gasFieldsUnitsChanged':
        onReactionChange(
          this.updatedReactionForGasFieldsUnitsChange(changeEvent)
        );
        break;
      case 'conversionRateChanged':
        onReactionChange(
          this.updatedReactionForConversionRateChange(changeEvent)
        );
        break;
      case 'componentReferenceChanged':
        onReactionChange(
          this.updatedReactionForComponentReferenceChange(changeEvent),
          { schemaChanged: true }
        );
        break;
      case 'ComponentMetricsChanged':
        onReactionChange(
          this.updatedReactionForComponentMetricsChange(changeEvent)
        );
        break;
      case 'VesselSizeChanged':
        onReactionChange(
          this.updatedReactionForVesselSizeChange()
        );
        break;
      default:
        break;
    }
  }

  addSampleTo(e, type) {
    const { onInputChange } = this.props;
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
      onInputChange(type, new Delta(contents));
    }
  }

  /**
   * Unified sample lookup that handles both regular samples and SBMM samples.
   *
   * Since SBMM (Sequence-Based Macromolecule) samples are stored separately from regular samples,
   * this method provides a convenient way to retrieve either type based on the isSbmm flag.
   * This eliminates the need for conditional logic throughout the component.
   *
   * @param {string|number} sampleID - The ID of the sample to retrieve
   * @param {boolean} [isSbmm=false] - If true, searches SBMM samples; if false, searches regular samples
   * @returns {Sample|SequenceBasedMacromoleculeSample} The sample object, or undefined if not found
   */
  findReactionSample(sampleID, isSbmm = false) {
    const { reaction } = this.props;

    // SBMM and regular samples are stored in different collections.
    return isSbmm
      ? reaction.findSbmmSample(sampleID)
      : reaction.sampleById(sampleID);
  }

  /**
   * Handles external label changes for both regular and SBMM samples.
   * External labels are typically used for solvent or reagent descriptions.
   */
  updatedReactionForExternalLabelChange(changeEvent) {
    const { sampleID, externalLabel, isSbmm } = changeEvent;
    // Use unified lookup to get either regular or SBMM sample
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);

    updatedSample.external_label = externalLabel;

    return this.updatedReactionWithSample(this.updatedSamplesForExternalLabelChange.bind(this), updatedSample);
  }

  updatedReactionForDrySolventChange(changeEvent) {
    const { sampleID, dry_solvent } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.dry_solvent = dry_solvent;

    return this.updatedReactionWithSample(this.updatedSamplesForDrySolventChange.bind(this), updatedSample);
  }

  updatedReactionForReferenceChange(changeEvent, type) {
    const { sampleID } = changeEvent;
    const { reaction } = this.props;

    const isSbmm = changeEvent.isSbmm === true;
    const sample = this.findReactionSample(sampleID, isSbmm);
    if (!sample) return reaction;

    if (type === 'weightPercentageReferenceChanged') {
      if (isSbmm) {
        return reaction;
      }
      reaction.markWeightPercentageSampleAsReference(sampleID);
      WeightPercentageReactionActions.setWeightPercentageReference(sample);
      WeightPercentageReactionActions.setTargetAmountWeightPercentageReference({
        value: sample.target_amount_value,
        unit: sample.target_amount_unit,
      });
      return this.updatedReactionWithSample(this.updatedSamplesForWeightPercentageReferenceChange.bind(this), sample);
    }

    if (isSbmm) {
      reaction.markSbmmSampleAsReference(sampleID);
    } else {
      reaction.markSampleAsReference(sampleID);
    }

    return this.updatedReactionWithSample(
      this.updatedSamplesForReferenceChange.bind(this),
      sample,
      undefined,
      true
    );
  }

  /**
   * Handles amount changes for both regular and SBMM samples.
   *
   * Clears reference_component_changed flag to ensure amount_mol is recalculated from the new amount.
   * Both regular and SBMM samples support the same setAmountAndNormalizeToGram method.
   */
  updatedReactionForAmountChange(changeEvent) {
    const { sampleID, amount, isSbmm } = changeEvent;
    // Use unified lookup to get either regular or SBMM sample
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);

    // When amount_g or amount_l is manually changed by user, clear the reference_component_changed flag
    // so that amount_mol will be calculated from amount_g instead of using reference component's amount_mol
    // Only do this for user-initiated changes, not programmatic changes (like during reference component switch)
    updatedSample.initializeSampleDetails?.();
    updatedSample.sample_details.reference_component_changed = false;

    // normalize to milligram
    updatedSample.setAmountAndNormalizeToGram(amount);

    return this.updatedReactionWithSample(
      this.updatedSamplesForAmountChange.bind(this),
      updatedSample,
      undefined,
      true
    );
  }

  /**
   * Handles amount unit changes for both regular and SBMM samples.
   *
   * Updates the sample amount for the new unit and recalculates all concentrations in the reaction,
   * since changing any material's volume affects the combined reaction volume.
   */
  updatedReactionForAmountUnitChange(changeEvent) {
    const { reaction } = this.props;
    const { sampleID, amount, isSbmm } = changeEvent;
    // Use unified lookup to get either regular or SBMM sample
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);

    // normalize to milligram
    // updatedSample.setAmountAndNormalizeToGram(amount);
    // setAmount should be called first before updating feedstock mole and volume values
    updatedSample.setAmount(amount);
    if (
      reaction.weight_percentage
      && updatedSample.weight_percentage_reference
      && changeEvent.amountType === 'target'
    ) {
      const amountUnitObject = {
        value: amount.value,
        unit: amount.unit,
      };
      WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(amountUnitObject);
    }

    // --- Validate mixture mass ---
    // Only validate for mixture samples
    if (updatedSample.isMixture && updatedSample.isMixture()) {
      this.warnIfMixtureMassExceeded(updatedSample, updatedSample.amount_g);
    }

    if (updatedSample.isCatalyst && updatedSample.isCatalyst()) {
      GasPhaseReactionActions.setCatalystReferenceMole(updatedSample.amount_mol);
    }

    // When any amount changes (mass, volume, or mol), recalculate all concentrations
    // This is necessary because:
    // 1. If volume (amount_l) changes directly, the combined reaction volume changes
    // 2. If mass or mol changes, it may affect amount_l (via density/conversion), changing the combined volume
    // In all cases, all material concentrations need to be recalculated
    reaction.updateAllConcentrations();

    return this.updatedReactionWithSample(
      this.updatedSamplesForAmountChange.bind(this),
      updatedSample,
      undefined,
      true
    );
  }

  /**
   * Handles metric changes (unit and prefix) for both regular and SBMM samples.
   *
   * Both sample types support the setUnitMetrics method which updates their unit representation.
   */
  updatedReactionForMetricsChange(changeEvent) {
    const {
      sampleID, metricUnit, metricPrefix, isSbmm
    } = changeEvent;

    // Use unified lookup to get either regular or SBMM sample
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);

    // Both SBMM and regular samples have setUnitMetrics method
    // SBMM samples update unit fields directly, regular samples update metrics string
    updatedSample.setUnitMetrics(metricUnit, metricPrefix);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForComponentMetricsChange(changeEvent) {
    const { reaction } = this.props;
    const {
      sampleId,
      componentId,
      metricUnit,
      metricPrefix
    } = changeEvent;

    // Find the sample that contains the component
    const updatedSample = reaction.sampleById(sampleId);

    if (!updatedSample || !updatedSample.isMixture() || !updatedSample.hasComponents()) {
      return reaction;
    }

    // Find the component within the sample
    const componentIndex = updatedSample.components.findIndex(
      (component) => component.id === componentId || component.parent_id === componentId
    );

    if (componentIndex !== -1) {
      // Update the component's metrics
      updatedSample.components[componentIndex].setUnitMetrics(metricUnit, metricPrefix);
      // Mark the sample as changed so the reaction save button activates
      updatedSample.changed = true;
    }

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  /**
   * Handles loading/amountType changes for both regular and SBMM samples.
   */
  updatedReactionForLoadingChange(changeEvent) {
    const { sampleID, amountType, isSbmm } = changeEvent;
    // Use unified lookup to get either regular or SBMM sample
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  /**
   * Handles amount type changes for both regular and SBMM samples.
   */
  updatedReactionForAmountTypeChange(changeEvent) {
    const { sampleID, amountType, isSbmm } = changeEvent;
    // Use unified lookup to get either regular or SBMM sample
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  /**
   * Handles stoichiometry coefficient changes for both regular and SBMM samples.
   */
  updatedReactionForCoefficientChange(changeEvent) {
    const { sampleID, coefficient, isSbmm } = changeEvent;
    // Use unified lookup to get either regular or SBMM sample
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);

    updatedSample.coefficient = coefficient;
    // enable update of equivalent only if weight percentage is not set
    if (!updatedSample.weight_percentage || updatedSample.weight_percentage === 0) {
      this.updatedReactionForEquivalentChange(changeEvent);
    }

    return this.updatedReactionWithSample(this.updatedSamplesForCoefficientChange.bind(this), updatedSample);
  }

  // Shows a standardized warning when a sample's entered mass exceeds
  // the available mixture mass calculated for that sample.
  // eslint-disable-next-line class-methods-use-this
  showMixtureMassExceededWarning(sample) {
    const totalMixtureMassG = sample?.total_mixture_mass_g ?? sample?.sample_details?.total_mixture_mass_g;
    const totalMixtureMassMg = Number.isFinite(totalMixtureMassG)
      ? totalMixtureMassG * 1000
      : null;

    NotificationActions.add({
      title: 'Mass Exceeded',
      message: 'Entered mass exceeds the available mixture mass for this sample. '
        + `(Available: ${totalMixtureMassMg?.toFixed(3)} mg)`,
      level: 'warning',
      autoDismiss: 5,
    });
  }

  // Validates the given mass (in grams) against the sample's available mixture mass
  // and shows a standardized warning if it is exceeded.
  warnIfMixtureMassExceeded(sample, massG = sample.amount_g) {
    const exceedsMassLimit = sample.validateMixtureMass(massG);
    if (exceedsMassLimit) {
      this.showMixtureMassExceededWarning(sample);
    }
  }

  updatedReactionForEquivalentChange(changeEvent) {
    const { reaction } = this.props;
    const {
      sampleID, equivalent, weightPercentageField, isSbmm
    } = changeEvent;
    const updatedSample = this.findReactionSample(sampleID, isSbmm === true);
    if (!updatedSample) return reaction;

    updatedSample.equivalent = equivalent;

    // When equivalent is 0, reset all amounts to 0
    if ((equivalent === 0 || equivalent === '0') && !weightPercentageField) {
      updatedSample.setAmount({ value: 0, unit: 'g' });
    }

    return this.updatedReactionWithSample(
      this.updatedSamplesForEquivalentChange.bind(this),
      updatedSample,
      undefined,
      true
    );
  }

  updatedReactionForWeightPercentageChange(changeEvent) {
    const { reaction } = this.props;
    const { sampleID, weightPercentage } = changeEvent;
    const updatedSample = reaction.sampleById(sampleID);
    updatedSample.weight_percentage = weightPercentage;
    if (weightPercentage == null || weightPercentage === 0) {
      updatedSample.equivalent = updatedSample.amount_mol / reaction.referenceMaterial.amount_mol;
    }
    return this.updatedReactionWithSample(this.updatedSamplesForWeightPercentageChange.bind(this), updatedSample);
  }

  calculateEquivalentForProduct(sample, referenceMaterial, stoichiometryCoeff) {
    const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
    if (sample.isGas()) {
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
    return this.updatedReactionWithSample(this.updatedSamplesForGasTypeChange.bind(this), updatedSample, value);
  }

  updatedReactionForCatalystDeletion() {
    const { reaction } = this.props;
    reaction.products = this.updatedSamplesForCatalystDeletion(reaction.products);
    return reaction;
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
        const moles = updatedSample.updateGasMoles(vesselVolume);
        updatedSample.setAmount({ value: moles, unit: 'mol' });
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

  updatedReactionForComponentReferenceChange(changeEvent) {
    const { reaction } = this.props;
    const { sampleID, componentId } = changeEvent;

    // Find the sample that contains the component
    const updatedSample = reaction.sampleById(sampleID);

    if (!updatedSample || !updatedSample.isMixture() || !updatedSample.hasComponents()) {
      return reaction;
    }

    const referenceComponentIndex = updatedSample.components.findIndex(
      (component) => component.id === componentId
    );

    // Handle case where a reference component is not found
    if (referenceComponentIndex === -1) {
      console.warn(`Component with id ${componentId} not found in sample ${sampleID}`);
      return reaction;
    }

    // Store the current amount_mol and amount_g BEFORE switching reference component
    // This ensures we preserve the values calculated with the OLD reference component
    updatedSample.initializeSampleDetails();
    updatedSample.storePreviousAmountState();

    // Set the reference component to true and all others to false
    updatedSample.components.forEach((component, index) => {
      // eslint-disable-next-line no-param-reassign
      component.reference = (index === referenceComponentIndex);
    });

    const referenceComponent = updatedSample.components[referenceComponentIndex];

    if (referenceComponent?.molecule?.molecular_weight) {
      updatedSample.sample_details.reference_molecular_weight = referenceComponent.molecule.molecular_weight;
    }

    // Set the reference relative molecular weight
    const relativeWeight = referenceComponent.relative_molecular_weight;
    if (relativeWeight) {
      updatedSample.sample_details.reference_relative_molecular_weight = relativeWeight;
    }

    // Mark that the reference component has been changed (for calculation logic)
    updatedSample.sample_details.reference_component_changed = true;

    // Perform calculations when the reference component changes
    this.calculateMixturePropertiesFromReferenceComponentChange(updatedSample, referenceComponent);

    // If the updated sample is the reference material, update equivalents of all other samples
    // This ensures that when reference sample's amount_mol changes (due to reference component switch),
    // other samples' equivalents are recalculated, just like when amount_g or amount_l changes
    if (reaction.referenceMaterial && updatedSample.id === reaction.referenceMaterial.id) {
      return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
    }

    // Mark the sample as changed for persistence
    updatedSample.changed = true;

    return reaction;
  }

  /**
   * When the reference component changes, adjust only derived values:
   * - Set sample's effective amount_mol to the reference component's amount_mol
   *   (via `reference_component_changed` so getters use it).
   * - If the parent sample is NOT the reaction reference and a valid
   *   reaction reference material exists, recalculate `equivalent` as
   *   `sample.amount_mol / reaction.referenceMaterial.amount_mol`.
   *
   * Note: Mass (amount_g) and volume (amount_l) remain unchanged.
   *
   * @param {Sample} updatedSample - The mixture sample being updated.
   * @param {Component} referenceComponent - The new reference component.
   */
  calculateMixturePropertiesFromReferenceComponentChange(updatedSample, referenceComponent) {
    if (!updatedSample || !referenceComponent) {
      console.warn('Missing sample or reference component for calculation');
      return;
    }

    const { reaction } = this.props;
    if (!reaction) return;

    // Query ComponentStore directly to get the current lock state for this reaction
    // This ensures we always have the latest state, even if it was changed elsewhere
    const lockEquivColumn = this.getReactionEquivLockState(reaction);

    // Ensure the sample has the reaction reference for lock state checks
    if (!updatedSample.belongTo) {
      updatedSample.belongTo = reaction;
    }

    if (lockEquivColumn) {
      this.handleReferenceComponentChangeWithLockedEquiv(updatedSample, referenceComponent);
    } else {
      this.handleReferenceComponentChangeWithUnlockedEquiv(updatedSample, referenceComponent, reaction);
    }
  }

  /**
   * Handles reference component change when equivalent is locked.
   * Keeps amount_mol and equivalent unchanged, recalculates amount_g from preserved amount_mol.
   * @param {Sample} updatedSample - The mixture sample being updated
   * @param {Component} referenceComponent - The new reference component
   */
  // eslint-disable-next-line class-methods-use-this
  handleReferenceComponentChangeWithLockedEquiv(updatedSample, referenceComponent) {
    const preservedAmountMol = updatedSample.sample_details?.previous_amount_mol;
    const newRelMolWeight = referenceComponent.relative_molecular_weight;

    if (Number.isFinite(preservedAmountMol) && preservedAmountMol > 0
        && newRelMolWeight && newRelMolWeight > 0) {
      const newAmountG = preservedAmountMol * newRelMolWeight;
      updatedSample.setAmount({ value: newAmountG, unit: 'g' });
    }
  }

  /**
   * Handles reference component change when equivalent is NOT locked.
   * Recalculates amount_mol from preserved amount_g and updates equivalent.
   * @param {Sample} updatedSample - The mixture sample being updated
   * @param {Component} referenceComponent - The new reference component
   * @param {Reaction} reaction - The reaction containing the sample
   */
  // eslint-disable-next-line class-methods-use-this
  handleReferenceComponentChangeWithUnlockedEquiv(updatedSample, referenceComponent, reaction) {
    const preservedAmountG = updatedSample.sample_details?.previous_amount_g;
    const newRelMolWeight = referenceComponent.relative_molecular_weight;

    if (updatedSample.amount_unit === 'mol' && Number.isFinite(preservedAmountG) && preservedAmountG > 0
      && newRelMolWeight && newRelMolWeight > 0) {
      // Calculate new amount_mol from preserved amount_g and new reference component's relMolWeight
      const newAmountMol = preservedAmountG / newRelMolWeight;
      updatedSample.amount_value = newAmountMol;
    } else if (updatedSample.amount_unit === 'mol' && referenceComponent.amount_mol != null) {
      // Fallback: use reference component's amount_mol if we can't calculate from preserved amount_g
      updatedSample.amount_value = referenceComponent.amount_mol;
    }

    // Calculate equivalent relative to the reaction's reference material since the amount_mol gets updated
    const referenceMaterial = reaction?.referenceMaterial;
    if (referenceMaterial?.amount_mol > 0) {
      updatedSample.calculateEquivalentFromReferenceMaterial?.(referenceMaterial);
    }
  }

  updatedReactionForVesselSizeChange() {
    return this.updatedReactionWithSample(this.updatedSamplesForVesselSizeChange.bind(this));
  }

  /**
   * Recalculates equivalent values for starting materials and reactants.
   * Uses the reference material's moles to compute each material's equivalent.
   *
   * Formula: equivalent = material.amount_mol / referenceMaterial.amount_mol
   *
   * @param {Object} reaction - The reaction object containing materials
   */
  // eslint-disable-next-line class-methods-use-this
  recalculateEquivalentsForMaterials(reaction) {
    const { referenceMaterial } = reaction;
    if (!referenceMaterial) {
      return;
    }

    const materialsToUpdate = [
      ...reaction.starting_materials,
      ...reaction.reactants,
    ];

    materialsToUpdate.forEach((material) => {
      if (!material.reference && material.amount_mol) {
        if (referenceMaterial.amount_mol === 0) {
          material.equivalent = 0;
        } else {
          material.equivalent = material.amount_mol / referenceMaterial.amount_mol;
        }
      }
    });
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
        errorMsg = 'Experimental mass value is larger than possible\n'
          + 'by 100% conversion! Please check your data.';
      }
    } else {
      const mwa = referenceM.decoupled ? (referenceM.molecular_mass || 0) : referenceM.molecule.molecular_weight;
      const deltaM = mwb - mwa;
      const massA = referenceM.amount_g;
      mFull = massA + (referenceM.amount_mol * deltaM);
      const massExperimental = updatedS.amount_g;

      if (deltaM > 0) { // expect weight gain
        if (massExperimental > mFull) {
          errorMsg = 'Experimental mass value is larger than possible\n'
            + 'by 100% conversion! Please check your data.';
        } else if (massExperimental < massA) {
          errorMsg = 'Material loss! '
            + 'Experimental mass value is less than possible!\n'
            + 'Please check your data.';
        }
      } else if (massExperimental < mFull) { // expect weight loss
        errorMsg = 'Experimental mass value is less than possible\n'
          + 'by 100% conversion! Please check your data.';
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
              if (updatedSample.isGas()) {
                const equivalent = this.calculateEquivalentForGasProduct(sample, vesselVolume);
                sample.equivalent = equivalent > 1 ? 1 : equivalent;
              } else if (!lockEquivColumn) {
                if (referenceMaterial.amount_mol > 0) {
                  sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol / stoichiometryCoeff;
                } else if (!sample.reference) {
                  // Set equivalent to 0 when reference material has no values (amount_mol = 0)
                  sample.equivalent = 0.0;
                }
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
            if (referenceMaterial.amount_mol > 0) {
              sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol / stoichiometryCoeff;
            } else if (!sample.reference) {
              // Set equivalent to 0 when reference material has no values (amount_mol = 0)
              sample.equivalent = 0.0;
            }
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
          if (referenceMaterial.amount_mol > 0) {
            sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
          } else {
            // Set equivalent to 0 when reference material has no values (amount_mol = 0)
            sample.equivalent = 0.0;
          }
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
        // Update TON values for gas products when catalyst amount changes
        if (updatedSample && updatedSample.gas_type === 'catalyst' && sample.isGas()) {
          sample.updateTONValue(sample.amount_mol);
        }
      }

      // For mixture samples, when amount_g changes, update components' amount_mol
      // This ensures that when the reference sample changes and causes amount_g to update,
      // the components within the mixture are recalculated based on the new total mass
      if (sample.isMixture && sample.isMixture() && sample.hasComponents && sample.hasComponents()) {
        sample.updateMixtureComponentAmounts();
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

  /**
   * Updates SBMM amount from an equivalent-derived mol value while preserving
   * the sample's currently selected mol unit.
   *
   * @param {SequenceBasedMacromoleculeSample} sample - SBMM sample to update.
   * @param {number} newAmountMol - Canonical amount in mol.
   * @returns {void}
   */
  // eslint-disable-next-line class-methods-use-this
  updateSbmmAmountFromEquivalent(sample, newAmountMol) {
    // Keep the sample's active mol unit, defaulting to mol when missing.
    const molUnit = sample.amount_as_used_mol_unit || 'mol';
    // Convert canonical mol input into the unit currently used by SBMM fields.
    const convertedAmount = convertUnits(newAmountMol, 'mol', molUnit);

    // Persist converted mol amount in the sample.
    sample.setAmount({ value: convertedAmount, unit: molUnit });
    // Recalculate dependent mass field derived from amount_as_used_mol.
    sample.calculateAmountAsUsedMass();
  }

  /**
   * Applies equivalent-driven amount updates for SBMM, mixture, and regular samples.
   *
   * @param {Sample|SequenceBasedMacromoleculeSample} sample - Target sample.
   * @param {number} newAmountMol - Calculated amount in mol.
   * @returns {void}
   */
  // eslint-disable-next-line class-methods-use-this
  handleEquivalentBasedAmountUpdate(sample, newAmountMol) {
    // SBMM amount for equivalent changes should be driven by mol amount.
    // Using mass normalization here clears mol in SBMM model setters.
    if (isSbmmSample(sample)) {
      this.updateSbmmAmountFromEquivalent(sample, newAmountMol);
      return;
    }

    if (
      sample.isMixture() && sample.hasComponents()
      && sample.reference_component
      && sample.reference_component.relative_molecular_weight
    ) {
      // For mixture samples with a valid reference component, calculate mass from mol amount
      const newAmountG = newAmountMol * sample.reference_component.relative_molecular_weight;
      sample.setAmount({ value: newAmountG, unit: 'g' });
    } else {
      // For regular samples or mixtures without reference MW, fall back to standard method
      sample.setAmountAndNormalizeToGram({
        value: newAmountMol,
        unit: 'mol',
      });
    }
  }

  updatedSamplesForEquivalentChange(samples, updatedSample, materialGroup) {
    const { reaction: { referenceMaterial } } = this.props;
    const referenceAmountMol = Number(referenceMaterial?.amount_mol);
    const hasReferenceAmountMol = Number.isFinite(referenceAmountMol) && referenceAmountMol > 0;
    let stoichiometryCoeff = 1.0;
    return samples.map((sample) => {
      stoichiometryCoeff = (sample.coefficient || 1.0) / (referenceMaterial?.coefficient || 1.0);
      if (sample.id === updatedSample.id && updatedSample.equivalent != null) {
        sample.equivalent = updatedSample.equivalent;
        if (hasReferenceAmountMol && updatedSample.gas_type !== 'feedstock') {
          const newAmountMol = Number(updatedSample.equivalent) * referenceAmountMol;
          this.handleEquivalentBasedAmountUpdate(sample, newAmountMol);
        } else if (sample.amount_value && updatedSample.gas_type !== 'feedstock') {
          sample.setAmountAndNormalizeToGram({
            value: updatedSample.equivalent * sample.amount_mol,
            unit: 'mol'
          });
        }
        // Validate resulting mass against available mixture mass and warn if exceeded
        this.warnIfMixtureMassExceeded(sample, sample.amount_g);
      }
      if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
        /* eslint-disable no-param-reassign, no-unused-expressions */
        if (materialGroup === 'products') {
          sample = this.calculateEquivalentForProduct(sample, referenceMaterial, stoichiometryCoeff);
        } else if (sample.reference) {
          // NB: sample equivalent independent of coeff
          sample.equivalent = 1;
        } else if (hasReferenceAmountMol) {
          // NB: sample equivalent independent of coeff
          const sampleAmountMol = Number(sample.amount_mol);
          sample.equivalent = Number.isFinite(sampleAmountMol)
            ? sampleAmountMol / referenceAmountMol
            : 0.0;
        } else {
          // NB: sample equivalent independent of coeff
          sample.equivalent = 0.0;
        }
      }
      return sample;
    });
  }

  /**
   * Updates the sample's weight percentage in a reaction when a sample's weight percentage changes.
   *
   * This method is called when a user modifies the weight percentage value of a sample
   * in the reaction scheme.
   *
   * Key behaviors:
   * - Only modifies the specific sample that changed
   * - Mutates the updated sample's weight percentage property
   *
   * @param {Array<Sample>} samples - Array of all samples in the current material group
   * @param {Sample} updatedSample - The sample whose weight percentage was changed
   * @returns {Array<Sample>} The updated samples array
   */
  updatedSamplesForWeightPercentageChange(samples, updatedSample) {
    const { reaction } = this.props;
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        if (sample.weight_percentage > 1 || sample.weight_percentage < 0) {
          NotificationActions.add({
            message: 'Weight percentage should be between 0 and 1',
            level: 'error'
          });
        } else {
          sample.weight_percentage = updatedSample.weight_percentage;
          if (updatedSample.weight_percentage == null || updatedSample.weight_percentage === 0) {
            sample.equivalent = sample.amount_mol / reaction.referenceMaterial.amount_mol;
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
    if (!referenceMaterial) return samples;

    const isReferenceSbmm = isSbmmSample(referenceMaterial);

    return samples.map((sample) => {
      const sampleIsSbmm = isSbmmSample(sample);
      const isReferenceMatch = sampleIsSbmm === isReferenceSbmm
        && sample.id === referenceMaterial.id;

      if (isReferenceMatch) {
        sample.equivalent = 1.0;
        sample.reference = true;
      } else {
        // Both Sample and SequenceBasedMacromoleculeSample have amount_mol getter
        const sampleAmountMol = sample.amount_mol;
        const referenceAmountMol = referenceMaterial.amount_mol;

        if (sample.amount_value || sampleAmountMol) {
          if (referenceMaterial && referenceAmountMol > 0) {
            if (materialGroup === 'products') {
              const refCoeff = referenceMaterial.coefficient || 1;
              const sampleCoeff = sample.coefficient || 1;
              sample.equivalent = (sampleAmountMol * refCoeff) / (referenceAmountMol * sampleCoeff);
            } else {
              sample.equivalent = sampleAmountMol / referenceAmountMol;
            }
          } else if ((materialGroup === 'starting_materials' || materialGroup === 'reactants') && referenceMaterial && !sample.reference) {
            // Set equivalent to 0 when reference material has no values (amount_mol = 0 or undefined)
              sample.equivalent = 0.0;
          }
        }
        sample.reference = false;
      }
      return sample;
    });
  }

  updatedSamplesForWeightPercentageReferenceChange(samples, referenceMaterial) {
    return samples.map((s) => {
      if (s.id === referenceMaterial.id) {
        s.weight_percentage_reference = true;
        // set weight percentage of reference (weight percentage ref) material to null
        s.weight_percentage = 1;
      } else {
        s.weight_percentage_reference = false;
      }
      return s;
    });
  }

  updatedSamplesForGasTypeChange(samples, updatedSample, materialGroup, prevGasType) {
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        sample.gas_type = updatedSample.gas_type;
        sample.equivalent = updatedSample.equivalent;
      } else if (sample.id !== updatedSample.id) {
        if ((updatedSample.gas_type === 'feedstock' && sample.isFeedstock())
        || (updatedSample.gas_type === 'catalyst' && sample.isCatalyst())) {
          sample.gas_type = 'off';
        }
        if (sample.isGas()) {
          const equivalent = this.calculateEquivalentForGasProduct(sample);
          sample.equivalent = equivalent;
          if ((prevGasType === 'CAT' && updatedSample.gas_type === 'off') || updatedSample.gas_type === 'catalyst') {
            sample.updateTONValue(sample.amount_mol);
          }
        }
      }
      return sample;
    });
  }

  updatedSamplesForCatalystDeletion(samples) {
    return samples.map((sample) => {
      if (sample.isGas()) {
        sample.updateTONValue(sample.amount_mol);
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

  updatedSamplesForVesselSizeChange(samples) {
    const vesselSize = GasPhaseReactionStore.getState().reactionVesselSizeValue;
    return samples.map((sample) => {
      if (sample.isGas() && sample.gas_phase_data) {
        const { part_per_million, temperature } = sample.gas_phase_data;
        let temperatureInKelvin = temperature.value;
        if (temperature.unit !== 'K') {
          temperatureInKelvin = convertTemperatureToKelvin({ value: temperature.value, unit: temperature.unit });
        }
        const moles = calculateGasMoles(vesselSize, part_per_million, temperatureInKelvin);
        sample.setAmount({ value: moles, unit: 'mol' });
        sample.updateTONValue(moles);
      }
      return sample;
    });
  }

  updatedReactionWithSample(updateFunction, updatedSample, type, includeSbmm = false) {
    const { reaction } = this.props;
    reaction.starting_materials = updateFunction(reaction.starting_materials, updatedSample, 'starting_materials', type);
    reaction.reactants = updateFunction(reaction.reactants, updatedSample, 'reactants', type);
    if (includeSbmm) {
      reaction.reactant_sbmm_samples = updateFunction(
        reaction.reactant_sbmm_samples,
        updatedSample,
        'reactants',
        type
      );
    }
    reaction.solvents = updateFunction(reaction.solvents, updatedSample, 'solvents', type);
    reaction.products = updateFunction(reaction.products, updatedSample, 'products', type);
    return reaction;
  }

  updateVesselSize(e) {
    const { onInputChange } = this.props;
    const { value } = e.target;
    onInputChange('vesselSizeAmount', value);
    const event = {
      type: 'VesselSizeChanged',
    };
    this.handleMaterialsChange(event);
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

  // Ensure first mixture becomes the reference with Eq=1,
  // and subsequent mixtures get Eq based on amount_mol relative to the reference material
  setEquivalentForMixture(splitSample, tagGroup) {
    if (tagGroup !== 'starting_materials' && tagGroup !== 'reactants') return;

    const { reaction } = this.props;

    if (!reaction.referenceMaterial) {
      reaction.markSampleAsReference(splitSample.id);
      splitSample.equivalent = 1.0;
      return;
    }

    const refMol = reaction.referenceMaterial?.amount_mol || 0;
    if (refMol > 0 && typeof splitSample.amount_mol === 'number') {
      splitSample.equivalent = splitSample.amount_mol / refMol;
    } else {
      // Set equivalent to 0 when reference has no mol amount (no values defined)
      splitSample.equivalent = 0.0;
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
            value={reaction.vessel_size?.amount ?? ''}
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

  reactionVolume() {
    const { reaction } = this.props;
    const isDisabled = !permitOn(reaction) || reaction.isMethodDisabled('volume');

    const metricPrefixes = ['m', 'u', 'n'];
    // Use default prefix 'm' (milli) - the component handles conversion to base unit (liters)
    const prefix = 'm';

    if (!isDisabled) {
      // Pass undefined explicitly when null/empty to avoid default value of 0
      // The component will show empty instead of "n.d." when value is undefined
      const volumeValue = (reaction.volume != null && reaction.volume !== '')
        ? reaction.volume
        : undefined;

      return (
        <Form.Group>
          <Form.Label>Reaction volume</Form.Label>
          <NumeralInputWithUnitsCompo
            value={volumeValue}
            unit="l"
            metricPrefix={prefix}
            metricPrefixes={metricPrefixes}
            precision={5}
            title="Reaction volume"
            variant="primary"
            id="numInput_reaction_volume_l"
            onChange={(e) => this.updateVolume(e)}
            onMetricsChange={(e) => this.updateVolume(e)}
          />
          <div className="mt-2">
            <Form.Check
              type="checkbox"
              id="use_reaction_volume"
              checked={reaction.use_reaction_volume || false}
              onChange={this.handleVolumeCheckboxChange}
              label={(
                <span>
                  Calculate Conc
                  <OverlayTrigger
                    placement="top"
                    overlay={(
                      <Tooltip id="volume-calculation-tooltip">
                        <div>
                          <strong>Concentration Calculation Method:</strong>
                          <br />
                          <strong>When checked:</strong>
                          {' Concentration calculations will use the reaction volume value entered above.'}
                          <br />
                          <strong>When unchecked:</strong>
                          {' Concentration calculations will be based on the sum of volumes from all reaction materials '}
                          (solvents, starting materials, and reactants).
                        </div>
                      </Tooltip>
                    )}
                  >
                    <i className="ms-1 fa fa-info-circle" />
                  </OverlayTrigger>
                </span>
              )}
            />
          </div>
        </Form.Group>
      );
    }
    return null;
  }

  updateVolume(e) {
    const { reaction, onInputChange } = this.props;
    if (e && e.value !== undefined) {
      // NumeralInputWithUnitsCompo converts the value to base unit (liters) automatically
      const newVolume = e.value === '' ? null : e.value;
      onInputChange('volume', newVolume);

      // If a valid reaction volume is set, automatically enable it for concentration calculation
      // and recalculate concentrations for all materials
      if (newVolume != null && newVolume > 0) {
        // Enable the checkbox if not already enabled
        if (!reaction.use_reaction_volume) {
          reaction.use_reaction_volume = true;
          onInputChange('useReactionVolumeForConcentration', true);
        }

        // Recalculate concentrations for all materials
        reaction.updateAllConcentrations();
      }
    }
  }

  handleVolumeCheckboxChange(event) {
    const { checked } = event.target;
    const { reaction, onInputChange } = this.props;

    // Show notification if checkbox is selected but volume is 0 or null
    if (checked && (reaction.volume == null || reaction.volume === 0 || reaction.volume === '')) {
      NotificationActions.add({
        title: 'Reaction Volume Required',
        message: 'Please enter a reaction volume value before enabling concentration calculation '
          + 'based on reaction volume.',
        level: 'warning',
        position: 'tc',
        dismissible: 'button',
        autoDismiss: 5,
      });
      // Don't update the checkbox if volume is invalid
      return;
    }

    // Update the reaction property
    reaction.use_reaction_volume = checked;

    // Trigger update through onInputChange
    onInputChange('useReactionVolumeForConcentration', checked);

    // Recalculate concentrations when checkbox state changes
    reaction.updateAllConcentrations();
  }

  render() {
    const {
      lockEquivColumn,
      reactionDescTemplate,
      displayYieldField,
    } = this.state;
    const { reaction, onInputChange, onReactionChange } = this.props;
    if (reaction.editedSample !== undefined) {
      if (reaction.editedSample.amountType === 'target') {
        this.updatedSamplesForEquivalentChange(reaction.samples, reaction.editedSample);
      } else { // real amount, so that we update amount in mmol
        this.updatedSamplesForAmountChange(reaction.samples, reaction.editedSample);
      }
      reaction.editedSample = undefined;
    } else {
      this.updateReactionMaterials();
      const { referenceMaterial } = reaction;
      if (referenceMaterial?.weight_percentage) {
        // If reference material has valid weight percentage value, ensure equivalents are recalculated as a result of amount changes to the reference material
        this.recalculateEquivalentsForMaterials(reaction);
      }
      reaction.products.map((sample) => {
        sample.updateConcentrationFromSolvent(reaction);
        if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
          if (sample.contains_residues) {
            sample.maxAmount = referenceMaterial.amount_g + (referenceMaterial.amount_mol
              * (sample.molecule.molecular_weight - referenceMaterial.molecule.molecular_weight));
          }
        }
      });
    }

    // Update concentrations for all materials when volumes change
    if ((typeof (lockEquivColumn) !== 'undefined' && !lockEquivColumn) || !reaction.changed) {
      reaction.allReactionMaterials.forEach((sample) => {
        sample.updateConcentrationFromSolvent(reaction);
      });
    }

    // if no reference material then mark first starting material
    const refM = reaction.starting_materials[0];
    if (!reaction.referenceMaterial && refM) {
      if (isSbmmSample(refM)) {
        reaction.markSbmmSampleAsReference(refM.id);
      } else {
        reaction.markSampleAsReference(refM.id);
      }
    }

    if (displayYieldField === null) {
      const allHaveNoConversion = reaction.products.every(
        (material) => !(material.conversion_rate && material.conversion_rate !== 0)
      );
      this.switchYield(allHaveNoConversion);
    }

    return (
      <>
        <div className="mt-2 border-top">
          <MaterialGroup
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
          />
          <MaterialGroup
            reaction={reaction}
            materialGroup="reactants"
            materials={reaction.reactantsWithSbmm}
            dropMaterial={this.dropMaterial}
            deleteMaterial={
              (material, materialGroup) => this.deleteMaterial(material, materialGroup)
            }
            dropSample={this.dropSample}
            dropSbmmSample={this.dropSbmmSample}
            showLoadingColumn={!!reaction.hasPolymers()}
            onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
            switchEquiv={this.switchEquiv}
            lockEquivColumn={lockEquivColumn}
            headIndex={reaction.starting_materials.length ?? 0}
          />
          <MaterialGroup
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
          />
          <MaterialGroup
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
          />
          <ReactionConditions
            conditions={reaction.conditions}
            isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('conditions')}
            onChange={(conditions) => {
              onInputChange('conditions', conditions);
              onReactionChange(reaction, { updateGraphic: true });
            }}
          />
        </div>

        <ReactionDetailsMainProperties
          reaction={reaction}
          onInputChange={onInputChange}
        />
        <ReactionDetailsDuration
          reaction={reaction}
          onInputChange={onInputChange}
        />
        <Row className="mb-3">
          <Col sm={3}>
            <Form.Group className="">
              <Form.Label className="text-nowrap">Type (Name Reaction Ontology)</Form.Label>
              <OlsTreeSelect
                selectName="rxno"
                selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
                onSelectChange={(event) => onInputChange('rxno', event.trim())}
                selectedDisable={!permitOn(reaction) || reaction.isMethodDisabled('rxno')}
              />
            </Form.Group>
          </Col>
          <Col sm={3}>
            {this.renderRole()}
          </Col>
          <Col sm={3}>
            {this.reactionVesselSize()}
          </Col>
          <Col sm={3}>
            {this.reactionVolume()}
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
                      onChange={(event) => onInputChange('description', event)}
                    />
                  ) : <QuillViewer value={reaction.description} />
              }
            </div>
          </Form.Group>
        </Row>
        <ReactionDetailsPurification
          reaction={reaction}
          onReactionChange={onReactionChange}
          onInputChange={onInputChange}
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
