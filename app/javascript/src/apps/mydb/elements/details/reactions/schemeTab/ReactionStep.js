import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Form, Button, Collapse } from 'react-bootstrap';

import Reaction from 'src/models/Reaction';
import MaterialGroup from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import ReactionDetailsMainProperties from 'src/apps/mydb/elements/details/reactions/ReactionDetailsMainProperties';
import ReactionDetailsDuration from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsDuration';
import ReactionConditions from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionConditions';
import { permitOn } from 'src/components/common/uis';

const ReactionStep = ({
  reaction,
  step,
  isInteractionReaction,
  lockEquivColumn,
  displayYieldField,
  dropMaterial,
  deleteMaterial,
  dropSample,
  dropSbmmSample,
  onMaterialsChange,
  switchEquiv,
  switchYield,
  onConditionsChange,
  onToggleCarryOn,
  onConcentrationModeChange,
  onDeleteStep,
  onStepFieldChange,
  stepSource,
  onStepInputChange,
  phField,
  vesselSizeField,
  reactionVolumeField,
}) => {
  const [open, setOpen] = useState(true);
  const stepId = step ? step.id : null;
  const carriedProducts = step ? reaction.carriedProductsIntoStep(stepId) : [];
  const destroyed = !!(step && step._destroy);
  const labelFor = (sample) => (
    sample.short_label || sample.name || sample.molecule_iupac_name || 'product'
  );
  const titleFor = (samples) => samples.map((s) => s.molecule_iupac_name).filter(Boolean).join(', ');
  const startingMaterials = step
    ? reaction.materialsForStep('starting_materials', stepId)
    : reaction.starting_materials;
  // SBMM reactants have no per-step link yet, so they ride along in the first step.
  const isFirstStep = step
    && reaction.reaction_steps.filter((entry) => !entry._destroy)[0]?.id === stepId;
  const reactants = step
    ? [
      ...reaction.materialsForStep('reactants', stepId),
      ...(isFirstStep ? (reaction.reactant_sbmm_samples || []) : []),
    ]
    : reaction.reactantsWithSbmm;
  const solvents = step
    ? reaction.materialsForStep('solvents', stepId)
    : reaction.solvents;
  const products = step
    ? reaction.materialsForStep('products', stepId)
    : reaction.products;
  const conditions = step ? (step.conditions || '') : reaction.conditions;

  const notCarried = step ? reaction.notCarriedIntoStep(stepId) : [];
  const carriedBanner = carriedProducts.length > 0 && (
    <div className="alert alert-warning py-2 px-3 mb-2">
      <div title={titleFor(carriedProducts)}>
        <i className="fa fa-lock me-2" />
        {`Starting material \u2014 ${carriedProducts.map(labelFor).join(', ')}, `}
        {`carried from step ${step.position - 1}`}
      </div>
      {notCarried.length > 0 && (
        <div className="small text-muted ms-4" title={titleFor(notCarried)}>
          {`${notCarried.map(labelFor).join(', ')} was not carried on`}
        </div>
      )}
    </div>
  );

  const groups = (
    <>
      {step && !isFirstStep ? carriedBanner : (
        <MaterialGroup
          reaction={reaction}
          materialGroup="starting_materials"
          materials={startingMaterials}
          dropMaterial={dropMaterial}
          deleteMaterial={deleteMaterial}
          dropSample={dropSample}
          showLoadingColumn={!!reaction.hasPolymers()}
          onChange={onMaterialsChange}
          switchEquiv={switchEquiv}
          lockEquivColumn={lockEquivColumn}
          onConcentrationModeChange={onConcentrationModeChange}
        />
      )}
      <MaterialGroup
        reaction={reaction}
        materialGroup="reactants"
        materials={reactants}
        dropMaterial={dropMaterial}
        deleteMaterial={deleteMaterial}
        dropSample={dropSample}
        dropSbmmSample={dropSbmmSample}
        showLoadingColumn={!!reaction.hasPolymers()}
        onChange={onMaterialsChange}
        switchEquiv={switchEquiv}
        lockEquivColumn={lockEquivColumn}
        headIndex={startingMaterials.length ?? 0}
      />
      <MaterialGroup
        reaction={reaction}
        materialGroup="solvents"
        materials={solvents}
        dropMaterial={dropMaterial}
        deleteMaterial={deleteMaterial}
        dropSample={dropSample}
        showLoadingColumn={!!reaction.hasPolymers()}
        onChange={onMaterialsChange}
        switchEquiv={switchEquiv}
        lockEquivColumn={lockEquivColumn}
      />
      <MaterialGroup
        reaction={reaction}
        materialGroup="products"
        materials={products}
        dropMaterial={dropMaterial}
        deleteMaterial={deleteMaterial}
        dropSample={dropSample}
        showLoadingColumn={!!reaction.hasPolymers()}
        onChange={onMaterialsChange}
        switchEquiv={switchEquiv}
        lockEquivColumn={lockEquivColumn}
        switchYield={switchYield}
        displayYieldField={displayYieldField}
        onToggleCarryOn={step ? (product) => onToggleCarryOn(product, step) : null}
      />
      {!isInteractionReaction && (
        <ReactionConditions
          conditions={conditions}
          isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('conditions')}
          onChange={(value) => onConditionsChange(value, stepId)}
        />
      )}
    </>
  );

  if (!step) return groups;

  return (
    <div className={`reaction-step border rounded p-2 mb-3${destroyed ? ' opacity-50' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <button
          type="button"
          className="btn btn-link text-decoration-none p-0 fw-bold"
          onClick={() => setOpen(!open)}
        >
          <i className={`fa fa-chevron-${open ? 'down' : 'right'} me-2`} />
          <span style={destroyed ? { textDecoration: 'line-through' } : undefined}>
            {`Step ${step.position}`}
          </span>
        </button>
        {permitOn(reaction) && (
          <Button
            variant={destroyed ? 'outline-secondary' : 'outline-danger'}
            size="sm"
            disabled={isFirstStep}
            title={isFirstStep ? 'The first step cannot be deleted' : 'Delete this step'}
            onClick={() => onDeleteStep(step)}
          >
            {destroyed ? 'Undo' : <i className="fa fa-trash" />}
          </Button>
        )}
      </div>
      <Collapse in={open && !destroyed}>
        <div>
          {groups}
          <ReactionDetailsMainProperties
            reaction={stepSource}
            onInputChange={onStepInputChange}
            showSchemeFields
            phField={phField}
            vesselSizeField={vesselSizeField}
            reactionVolumeField={reactionVolumeField}
          />
          <div className="mt-3">
            <ReactionDetailsDuration
              reaction={stepSource}
              onInputChange={onStepInputChange}
            />
          </div>
          <div className="mb-2">
            <Form.Label className="mb-0 small">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              size="sm"
              value={step.description || ''}
              disabled={!permitOn(reaction)}
              onChange={(event) => onStepFieldChange(stepId, 'description', event.target.value)}
            />
          </div>
        </div>
      </Collapse>
    </div>
  );
};

ReactionStep.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  step: PropTypes.shape({
    id: PropTypes.any,
    position: PropTypes.number,
    _destroy: PropTypes.bool,
    description: PropTypes.string,
    conditions: PropTypes.string,
    duration: PropTypes.string,
    ph_operator: PropTypes.string,
    ph_value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    volume: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    temperature: PropTypes.shape({
      userText: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      valueUnit: PropTypes.string,
    }),
    vessel_size: PropTypes.shape({
      amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      unit: PropTypes.string,
    }),
  }),
  isInteractionReaction: PropTypes.bool.isRequired,
  lockEquivColumn: PropTypes.bool,
  displayYieldField: PropTypes.bool,
  dropMaterial: PropTypes.func.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  dropSbmmSample: PropTypes.func.isRequired,
  onMaterialsChange: PropTypes.func.isRequired,
  switchEquiv: PropTypes.func.isRequired,
  switchYield: PropTypes.func.isRequired,
  onConditionsChange: PropTypes.func.isRequired,
  onToggleCarryOn: PropTypes.func.isRequired,
  onConcentrationModeChange: PropTypes.func.isRequired,
  onDeleteStep: PropTypes.func.isRequired,
  onStepFieldChange: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  stepSource: PropTypes.object,
  onStepInputChange: PropTypes.func,
  phField: PropTypes.node,
  vesselSizeField: PropTypes.node,
  reactionVolumeField: PropTypes.node,
};

ReactionStep.defaultProps = {
  step: null,
  lockEquivColumn: false,
  displayYieldField: null,
  stepSource: null,
  onStepInputChange: () => {},
  phField: null,
  vesselSizeField: null,
  reactionVolumeField: null,
};

export default ReactionStep;
