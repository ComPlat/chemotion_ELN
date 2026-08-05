/* eslint-disable react/sort-comp */
import React from 'react';
import PropTypes from 'prop-types';
import { Select } from 'src/components/common/Select';
import {
  Form, Row, Col, Button, InputGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import MaterialGroup from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import Reaction from 'src/models/Reaction';
import { isSbmmSample } from 'src/utilities/ElementUtils';
import ReactionDetailsMainProperties from 'src/apps/mydb/elements/details/reactions/ReactionDetailsMainProperties';
import ReactionDetailsPurification from
    'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsPurification';
import ReactionUpdateHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import ReactionConditions from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionConditions';
import GeneralProcedureDnd from 'src/apps/mydb/elements/details/reactions/schemeTab/GeneralProcedureDnD';
import { rolesOptions } from 'src/components/staticDropdownOptions/options';

import QuillViewer from 'src/components/QuillViewer';
import ReactionDescriptionEditor from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDescriptionEditor';

import OlsTreeSelect from 'src/components/OlsComponent';
import ReactionDetailsDuration from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsDuration';
import { permitOn } from 'src/components/common/uis';
import {
  findVariationRange, variationRangeText
} from 'src/apps/mydb/elements/details/reactions/schemeTab/VariationRangeUtils';

import { StoreContext } from 'src/stores/mobx/RootStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

export default class ReactionDetailsScheme extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);

    const textTemplate = TextTemplateStore.getState().reactionDescription;
    this.reactionUpdateHandler = new ReactionUpdateHandler({
        ...props,
        onLockEquivColChange: this.onLockEquivColChange.bind(this)
      },
      this.context);
    this.state = {
      lockEquivColumn: this.reactionUpdateHandler.lockEquivColumn,
      displayYieldField: null,
      reactionDescTemplate: textTemplate.toJS(),
    };

    this.reactQuillRef = React.createRef();
    this.additionQuillRef = React.createRef();

    this.handleTemplateChange = this.handleTemplateChange.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);

  }

  onLockEquivColChange(lockEquivColumn) {
    /*
     The handler's lazy `lockEquivColumn` getter fires this on first read - which the constructor
     does to seed the state, before `this.state` even exists. The value lands in state through that
     seeding, so the callback only has work to do once there is a state to differ from.
     */
    if (!this.state || this.state.lockEquivColumn === lockEquivColumn) {
      return;
    }
    this.setState({ lockEquivColumn });
  }

  componentDidMount() {
    TextTemplateStore.listen(this.handleTemplateChange);
    TextTemplateActions.fetchTextTemplates('reaction');
    TextTemplateActions.fetchTextTemplates('reactionDescription');

    // Deserialize components for any existing samples in the reaction
    this.reactionUpdateHandler.deserializeReactionMaterialComponents();
  }

  componentDidUpdate(prevProps) {
    const { reaction } = this.props;
    // Deserialize components when reaction data changes (e.g., after save/reload)
    if (prevProps.reaction !== reaction) {
      this.reactionUpdateHandler = new ReactionUpdateHandler({
          ...this.props,
          onLockEquivColChange: this.onLockEquivColChange.bind(this)
        },
        this.context);

      this.reactionUpdateHandler.deserializeReactionMaterialComponents();
      // Update lock state when reaction changes
      this.reactionUpdateHandler.updateReactionEquivLockState();

    }
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.handleTemplateChange);
    this.reactionUpdateHandler.resetGasPhaseStore();
  }

  // eslint-disable-next-line class-methods-use-this
  updateTextTemplates(textTemplate) {
    TextTemplateActions.updateTextTemplates('reactionDescription', textTemplate);
  }

  handleTemplateChange(state) {
    const desc = state.reactionDescription;
    this.setState({
      reactionDescTemplate: desc?.toJS ? desc.toJS() : desc
    });
  }

  switchYield = (shouldDisplayYield) => {
    this.setState({ displayYieldField: !!shouldDisplayYield });
  };

  renderVolumeCalculationTooltip() {
    return (
      <Tooltip id="volume-calculation-tooltip">
        <div>
          <strong>Concentration Calculation Method:</strong>
          <br/>
          <strong>When checked:</strong>
          {' Concentration calculations will use the reaction volume value entered above.'}
          <br/>
          <strong>When unchecked:</strong>
          {' Concentration calculations will be based on the sum of volumes from all reaction materials '}
          (solvents, starting materials, and reactants).
        </div>
      </Tooltip>
    );
  }

  reactionVolume() {
    const { reaction, variations } = this.props;
    const isDisabled = !permitOn(reaction) || reaction.isMethodDisabled('volume');

    const metricPrefixes = ['m', 'u', 'n'];
    // Use default prefix 'm' (milli) - the component handles conversion to base unit (liters)
    const prefix = 'm';

    if (!isDisabled) {
      const volumeValue = this.reactionUpdateHandler.parseVolumeValue(reaction.volume);
      // The range is in litres, like the value itself: the input applies the metric prefix.
      const {
        min: rangeStart, max: rangeEnd, isRangeField
      } = findVariationRange(
        variations,
        (variationReaction) => this.reactionUpdateHandler.parseVolumeValue(variationReaction.volume),
        volumeValue,
      );
      /*
       Both handlers are unwired while the field shows a range. The unit button of the input stays
       clickable even when the input itself is disabled, and switching the prefix reports back
       through onMetricsChange - which writes the volume - so leaving it wired would let a click on
       it overwrite what the variations hold.
       */
      const updateVolume = isRangeField ? undefined : (e) => this.reactionUpdateHandler.updateVolume(e);

      return (
        <Form.Group>
          <Form.Label>
            Reaction volume
            <OverlayTrigger
              placement="top"
              overlay={(
                <Tooltip id="lock_volume_tooltip">
                  Lock/unlock reaction volume
                  <br/>
                  When locked, volume won&apos;t be auto-calculated
                </Tooltip>
              )}
            >
              <Button
                id="lock_reaction_volume_btn"
                size="sm"
                variant={reaction.isVolumeLocked ? 'warning' : 'light'}
                onClick={this.reactionUpdateHandler.switchVolumeLock}
                className="ms-1 py-0 px-1"
              >
                <i className={reaction.isVolumeLocked ? 'fa fa-lock' : 'fa fa-unlock'}/>
              </Button>
            </OverlayTrigger>
          </Form.Label>
          <NumeralInputWithUnitsCompo
            value={volumeValue}
            unit="l"
            metricPrefix={prefix}
            metricPrefixes={metricPrefixes}
            precision={5}
            title="Reaction volume"
            active
            id="numInput_reaction_volume_l"
            isRangeField={isRangeField}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            disabled={reaction.isVolumeLocked || isRangeField}
            disableUnitButtonPadding
            onChange={updateVolume}
            onMetricsChange={updateVolume}
          />
          <Form.Check
            className="mt-2"
            type="checkbox"
            id="use_reaction_volume"
            checked={reaction.use_reaction_volume || false}
            onChange={this.reactionUpdateHandler.handleVolumeCheckboxChange}
            label={(
              <span>
                Calculate Conc
                <OverlayTrigger
                  placement="top"
                  overlay={this.renderVolumeCalculationTooltip()}
                >
                  <i className="ms-1 fa fa-info-circle"/>
                </OverlayTrigger>
              </span>
            )}
          />
        </Form.Group>
      );
    }
    return null;
  }

  reactionVesselSize() {
    const { reaction, variations } = this.props;
    // Compared in whatever unit the reaction is in, which is the unit the range is shown in too.
    const range = findVariationRange(
      variations,
      (variationReaction) => variationReaction.vessel_size?.amount,
      reaction.vessel_size?.amount,
    );
    const isDisabled = reaction.can_update === false || range.isRangeField;

    return (
      <Form.Group>
        <Form.Label>Vessel size</Form.Label>
        <InputGroup>
          <Form.Control
            name="reaction_vessel_size"
            type="text"
            value={range.isRangeField ? variationRangeText(range) : (reaction.vessel_size?.amount ?? '')}
            disabled={isDisabled}
            onChange={(event) => this.reactionUpdateHandler.updateVesselSize(event)}
            onBlur={(event) => this.reactionUpdateHandler.updateVesselSizeOnBlur(event, reaction.vessel_size.unit)}
            className="flex-grow-1 Select-control"
          />
          <Button
            disabled={isDisabled}
            variant="light"
            onClick={() => this.reactionUpdateHandler.changeVesselSizeUnit()}
          >
            {reaction.vessel_size?.unit || 'ml'}
          </Button>
        </InputGroup>
      </Form.Group>
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

  renderPhConditionProperty() {
    const { reaction, onInputChange } = this.reactionUpdateHandler.props;
    const { variations } = this.props;
    const operator = reaction.ph_operator || '=';
    const value = reaction.ph_value ?? '';
    const range = findVariationRange(
      variations,
      (variationReaction) => variationReaction.ph_value,
      reaction.ph_value,
    );
    const isDisabled = !permitOn(reaction) || range.isRangeField;

    return (
      <Form.Group>
        <Form.Label>pH</Form.Label>
        <InputGroup>
          <Button
            className="reaction-ph-operator"
            disabled={isDisabled}
            variant="primary"
            onClick={() => this.reactionUpdateHandler.changePhOperator()}
          >
            {operator}
          </Button>
          <Form.Control
            // A range is not a number, so the input has to take text while it shows one.
            type={range.isRangeField ? 'text' : 'number'}
            step="any"
            value={range.isRangeField ? variationRangeText(range) : value}
            disabled={isDisabled}
            placeholder="value"
            onChange={(event) => onInputChange('phValue', event.target.value)}
          />
        </InputGroup>
      </Form.Group>
    );
  }

  renderGPDnD() {
    const { reaction } = this.props;
    return (
      <GeneralProcedureDnd
        reaction={reaction}
      />
    );
  }

  renderRolesOption({ icon, label, variant }) {
    return (
      <>
        <i className={`fa ${icon} text-${variant} me-2`}/>
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
        value={rolesOptions.find(({ value }) => value === role)}
        onChange={this.reactionUpdateHandler.onChangeRole}
      />
    );
  }

  render() {
    const {
      lockEquivColumn,
      reactionDescTemplate,
      displayYieldField,
    } = this.state;
    const {
      variations
    } = this.props;
    const { reaction, onInputChange, onReactionChange } = this.reactionUpdateHandler.props;
    const isInteractionReaction = reaction.isInteractionReaction();
    if (reaction.editedSample !== undefined) {
      if (reaction.editedSample.amountType === 'target') {
        this.reactionUpdateHandler.updatedSamplesForEquivalentChange(reaction.samples, reaction.editedSample);
      } else { // real amount, so that we update amount in mmol
        this.reactionUpdateHandler.updatedSamplesForAmountChange(reaction.samples, reaction.editedSample);
      }
      reaction.editedSample = undefined;
    } else {
      this.reactionUpdateHandler.updateReactionMaterials();
      const { referenceMaterial } = reaction;
      if (referenceMaterial?.weight_percentage) {
        // If reference material has valid weight percentage value, ensure equivalents are recalculated as a result of
        // amount changes to the reference material
        this.reactionUpdateHandler.recalculateEquivalentsForMaterials(reaction);
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

    /*
     Until the user has toggled yield/conversion, the field follows the data: yield unless some
     product carries a conversion rate. Derived here rather than pushed into state, which would be a
     setState during render.
     */
    const effectiveDisplayYieldField = displayYieldField ?? reaction.products.every(
      (material) => !(material.conversion_rate && material.conversion_rate !== 0)
    );

    const getMaterialsIncludingVariations = (materialGroup) => {
      const materials = [...reaction[materialGroup]];
      variations.forEach(({ data: variation }) => {
        while (materials.length < variation[materialGroup].length) {
          materials.push(variation[materialGroup][materials.length]);
        }
      });

      return materials;
    };

    return (
      <>
        <div className="mt-2 border-top">
          <MaterialGroup
            reaction={reaction}
            variations={variations}
            materialGroup="starting_materials"
            materials={getMaterialsIncludingVariations('starting_materials')}
            dropMaterial={this.reactionUpdateHandler.dropMaterial}
            deleteMaterial={
              (material, materialGroup) => this.reactionUpdateHandler.deleteMaterial(material, materialGroup)
            }
            dropSample={this.reactionUpdateHandler.dropSample}
            showLoadingColumn={!!reaction.hasPolymers()}
            onChange={(changeEvent) => this.reactionUpdateHandler.handleMaterialsChange(changeEvent)}
            switchEquiv={this.reactionUpdateHandler.switchEquiv}
            lockEquivColumn={this.reactionUpdateHandler.lockEquivColumn}
          />
          <MaterialGroup
            reaction={reaction}
            variations={variations}
            materialGroup="reactants"
            materials={getMaterialsIncludingVariations('reactantsWithSbmm')}
            dropMaterial={this.reactionUpdateHandler.dropMaterial}
            deleteMaterial={
              (material, materialGroup) => this.reactionUpdateHandler.deleteMaterial(material, materialGroup)
            }
            dropSample={this.reactionUpdateHandler.dropSample}
            dropSbmmSample={this.reactionUpdateHandler.dropSbmmSample}
            showLoadingColumn={!!reaction.hasPolymers()}
            onChange={(changeEvent) => this.reactionUpdateHandler.handleMaterialsChange(changeEvent)}
            switchEquiv={this.reactionUpdateHandler.switchEquiv}
            lockEquivColumn={lockEquivColumn}
            headIndex={reaction.starting_materials.length ?? 0}
          />
          <MaterialGroup
            reaction={reaction}
            variations={variations}
            materialGroup="solvents"
            materials={getMaterialsIncludingVariations('solvents')}
            dropMaterial={this.reactionUpdateHandler.dropMaterial}
            deleteMaterial={
              (material, materialGroup) => this.reactionUpdateHandler.deleteMaterial(material, materialGroup)
            }
            dropSample={this.reactionUpdateHandler.dropSample}
            showLoadingColumn={!!reaction.hasPolymers()}
            onChange={(changeEvent) => this.reactionUpdateHandler.handleMaterialsChange(changeEvent)}
            switchEquiv={this.reactionUpdateHandler.switchEquiv}
            lockEquivColumn={this.reactionUpdateHandler.lockEquivColumn}
          />
          <MaterialGroup
            reaction={reaction}
            variations={variations}
            materialGroup="products"
            materials={getMaterialsIncludingVariations('products')}
            dropMaterial={this.reactionUpdateHandler.dropMaterial}
            deleteMaterial={
              (material, materialGroup) => this.reactionUpdateHandler.deleteMaterial(material, materialGroup)
            }
            dropSample={this.reactionUpdateHandler.dropSample}
            showLoadingColumn={!!reaction.hasPolymers()}
            onChange={(changeEvent) => this.reactionUpdateHandler.handleMaterialsChange(changeEvent)}
            switchEquiv={this.reactionUpdateHandler.switchEquiv}
            lockEquivColumn={this.reactionUpdateHandler.lockEquivColumn}
            switchYield={this.switchYield}
            displayYieldField={effectiveDisplayYieldField}
          />
          {!isInteractionReaction && (
            <ReactionConditions
              conditions={reaction.conditions}
              isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('conditions')}
              onChange={(conditions) => {
                onInputChange('conditions', conditions);
                onReactionChange(reaction, { updateGraphic: true });
              }}
            />
          )}
        </div>

        <ReactionDetailsMainProperties
          reaction={reaction}
          variations={variations}
          onInputChange={onInputChange}
          showSchemeFields
          phField={this.renderPhConditionProperty()}
          vesselSizeField={isInteractionReaction ? null : this.reactionVesselSize()}
          durationField={isInteractionReaction ? (
            <ReactionDetailsDuration
              reaction={reaction}
              variations={variations}
              onInputChange={onInputChange}
              isInteractionReaction
              inlineInteractionField
            />
          ) : null}
          reactionVolumeField={this.reactionVolume()}
        />
        {!isInteractionReaction && (
          <ReactionDetailsDuration
            reaction={reaction}
            variations={variations}
            onInputChange={onInputChange}
          />
        )}
        {/* Interaction mode intentionally drops ontology and role fields from the scheme tab. */}
        {!isInteractionReaction && (
          <Row className="mb-3">
            <Col sm={3}>
              <Form.Group className="">
                <Form.Label className="text-nowrap">Type (Name Reaction)</Form.Label>
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
          </Row>
        )}
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
                  ) : <QuillViewer value={reaction.description}/>
              }
            </div>
          </Form.Group>
        </Row>
        <ReactionDetailsPurification
          reaction={reaction}
          onReactionChange={onReactionChange}
          onInputChange={onInputChange}
          additionQuillRef={this.additionQuillRef}
          onChange={(event) => this.reactionUpdateHandler.handleMaterialsChange(event)}
          isInteractionReaction={isInteractionReaction}
        />
      </>
    );
  }
}

ReactionDetailsScheme.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired,
  variations: PropTypes.arrayOf(PropTypes.shape({
    idx: PropTypes.number.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  })).isRequired
};
