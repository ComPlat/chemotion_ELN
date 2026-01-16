import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import classNames from 'classnames';
import { Select } from 'src/components/common/Select';
import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import Molecule from 'src/models/Molecule';
import Reaction from 'src/models/Reaction';
import { defaultMultiSolventsSmilesOptions } from 'src/components/staticDropdownOptions/options';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import { reagents_kombi } from 'src/components/staticDropdownOptions/reagents_kombi';
import { permitOn } from 'src/components/common/uis';
import ToggleButton from 'src/components/common/ToggleButton';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ReorderableMaterialContainer
  from 'src/apps/mydb/elements/details/reactions/schemeTab/ReorderableMaterialContainer';
import CreateButton from 'src/components/common/CreateButton';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const headers = {
  ref: 'Ref',
  group: 'Starting materials',
  tr: 'T/R',
  mass: 'Mass',
  reaction_coefficient: 'Coef',
  amount: 'Amount',
  molar_mass: 'MW',
  density: 'd',
  purity: 'Purity',
  loading: 'Loading',
  concn: 'Conc',
  vol: 'Vol',
  eq: 'Eq'
};

function MaterialGroup({
  materials, materialGroup, deleteMaterial, onChange,
  showLoadingColumn, reaction, headIndex,
  dropMaterial, dropSample, dropSbmmSample, switchEquiv, lockEquivColumn, displayYieldField,
  switchYield
}) {
  const getMaterialComponent = ({
    dragRef,
    dropRef,
    material,
    index,
    isOver,
    canDrop,
    isDragging
  }) => (
    <Material
      key={material.id}
      reaction={reaction}
      onChange={onChange}
      material={material}
      materialGroup={materialGroup}
      showLoadingColumn={showLoadingColumn}
      deleteMaterial={(m) => deleteMaterial(m, materialGroup)}
      index={index + 1}
      lockEquivColumn={lockEquivColumn}
      displayYieldField={displayYieldField}
      dragRef={dragRef}
      dropRef={dropRef}
      isOver={isOver}
      canDrop={canDrop}
      isDragging={isDragging}
    />
  );

  const onDrop = (item, index) => {
    if (item.type === DragDropItemTypes.SAMPLE) {
      dropSample(item.element, materials.at(index), materialGroup);
    }
    if (item.type === DragDropItemTypes.MOLECULE) {
      dropSample(item.element, materials.at(index), materialGroup, null, true);
    }
    if (item.type === DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE_SAMPLE) {
      // Handle SBMM drop - only for reactants group
      if (materialGroup === 'reactants' && dropSbmmSample) {
        dropSbmmSample(item.element, materials.at(index), materialGroup);
      } else {
        // Show notification if trying to drop SBMM into other groups
        NotificationActions.add({
          title: 'Invalid drop location',
          message: 'SBMM samples can only be added to the Reactants group.',
          level: 'warning'
        });
      }
    }
  };

  const onReorder = (item, index) => {
    dropMaterial(item.material, item.materialGroup, materials.at(index), materialGroup);
  };

  if (materialGroup === 'solvents'
    || materialGroup === 'purification_solvents') {
    return (
      <SolventsMaterialGroup
        materials={materials}
        materialGroup={materialGroup}
        dropSample={dropSample}
        onDrop={onDrop}
        onReorder={onReorder}
        getMaterialComponent={getMaterialComponent}
        headIndex={headIndex}
        reaction={reaction}
      />
    );
  }

  return (
    <GeneralMaterialGroup
      materials={materials}
      materialGroup={materialGroup}
      dropSample={dropSample}
      onDrop={onDrop}
      onReorder={onReorder}
      getMaterialComponent={getMaterialComponent}
      headIndex={headIndex}
      showLoadingColumn={showLoadingColumn}
      reaction={reaction}
      switchEquiv={switchEquiv}
      lockEquivColumn={lockEquivColumn}
      displayYieldField={displayYieldField}
      switchYield={switchYield}
    />
  );
}

function SwitchEquivButton({ lockEquivColumn, switchEquiv }) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id="assign_button">
          Lock/unlock Equiv
          <br />
          for target amounts
        </Tooltip>
      )}
    >
      <Button
        id="lock_equiv_column_btn"
        size="xxsm"
        variant={lockEquivColumn ? 'warning' : 'light'}
        onClick={switchEquiv}
        className="ms-1"
      >
        <i className={lockEquivColumn ? 'fa fa-lock' : 'fa fa-unlock'} />
      </Button>
    </OverlayTrigger>
  );
}

SwitchEquivButton.propTypes = {
  lockEquivColumn: PropTypes.bool.isRequired,
  switchEquiv: PropTypes.func.isRequired
};

function materialGroupClassNames({ isEmpty, isOver, canDrop }) {
  return classNames('material-group', {
    'material-group--is-over': isEmpty && isOver,
    'material-group--can-drop': isEmpty && canDrop,
  });
}

function GeneralMaterialGroup({
  materials, materialGroup, getMaterialComponent, headIndex,
  dropSample, onDrop, onReorder,
  showLoadingColumn, reaction,
  switchEquiv, lockEquivColumn, displayYieldField, switchYield
}) {
  const isReactants = materialGroup === 'reactants';
  const groupHeaders = { ...headers };

  let reagentDd = null;
  if (isReactants) {
    groupHeaders.group = 'Reactants';

    const reagentList = Object.keys(reagents_kombi).map((x) => ({
      label: x,
      value: reagents_kombi[x]
    }));

    const createReagentForReaction = ({ label, value: smi }) => {
      MoleculesFetcher.fetchBySmi(smi)
        .then((result) => {
          const molecule = new Molecule(result);
          molecule.density = molecule.density || 0;
          dropSample(molecule, null, materialGroup, label);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };

    reagentDd = (
      <Select
        isDisabled={!permitOn(reaction)}
        value={null}
        options={reagentList}
        placeholder="Add"
        onChange={createReagentForReaction}
        size="xsm"
        styles={{
          menu: (base) => ({
            ...base,
            minWidth: 800,
            width: '800px',
            maxWidth: '95vw',
          }),
          option: (base) => ({
            ...base,
            fontSize: '0.875rem',
          }),
        }}
      />
    );
  }

  const yieldConversionRateFields = () => {
    const conversionText = (
      <>
        Click to switch to conversion field.
        <br />
        The conversion will be displayed as part of the reaction scheme.
      </>
    );
    const yieldText = (
      <>
        Click to switch to yield field.
        <br />
        The yield will be displayed as part of the reaction scheme.
      </>
    );
    let conversionOrYield = displayYieldField;
    if (displayYieldField || displayYieldField === null) {
      conversionOrYield = true;
    }
    return (
      <ToggleButton
        isToggledInitial={conversionOrYield}
        onToggle={switchYield}
        onLabel="Yield"
        offLabel="Conv."
        variant="primary"
        tooltipOn={conversionText}
        tooltipOff={yieldText}
        size="xsm"
      />
    );
  };

  if (materialGroup === 'products') {
    groupHeaders.group = 'Products';
    groupHeaders.eq = yieldConversionRateFields();
  }

  const specialRefTHead = reaction.weight_percentage ? (
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id="coefficientHeaderTitleReactionScheme">
          Select Reference material for weight percentage calculation
        </Tooltip>
      )}
    >
      <span>{groupHeaders.ref}</span>
    </OverlayTrigger>
  ) : null;

  const refTHead = materialGroup !== 'products' ? groupHeaders.ref : specialRefTHead;
  /**
   * Add a (not yet persisted) sample to a material group
   * of the given reaction
   */
  const addSampleButton = (
    <CreateButton
      disabled={!permitOn(reaction)}
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
      size="xsm"
    />
  );

  return (
    <ReorderableMaterialContainer
      materials={materials}
      materialGroup={materialGroup}
      onDrop={onDrop}
      onReorder={onReorder}
      renderMaterial={({ index, ...props }) => getMaterialComponent({
        ...props,
        index: headIndex + index
      })}
    >
      {({
        contents, dropRef, isOver, canDrop
      }) => (
        <div
          ref={dropRef}
          className={materialGroupClassNames({
            isEmpty: materials.length === 0,
            isOver,
            canDrop
          })}
        >
          <div className="pseudo-table__row pseudo-table__row-header">
            <div className="pseudo-table__cell pseudo-table__cell-title">
              <div className="material-group__header-title">
                {addSampleButton}
                {groupHeaders.group}
                {isReactants && reagentDd}
              </div>
            </div>
            <div className="reaction-material__ref-header">{refTHead}</div>
            <div className="reaction-material__target-header">{groupHeaders.tr}</div>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="coefficientHeaderTitleReactionScheme">Coefficient</Tooltip>}
            >
              <div className="reaction-material__coefficient-header">{groupHeaders.reaction_coefficient}</div>
            </OverlayTrigger>
            <div className="reaction-material__amount-header">{groupHeaders.amount}</div>
            <div className="reaction-material__molar-mass-header">{groupHeaders.molar_mass}</div>
            <div className="reaction-material__density-header">{groupHeaders.density}</div>
            <div className="reaction-material__purity-header">{groupHeaders.purity}</div>
            {showLoadingColumn && <div className="reaction-material__loading-header">{groupHeaders.loading}</div>}
            <div className="reaction-material__concentration-header">{groupHeaders.concn}</div>
            <div className="reaction-material__equivalent-header">
              {groupHeaders.eq}
              {materialGroup === 'starting_materials' && (
                <SwitchEquivButton
                  lockEquivColumn={lockEquivColumn}
                  switchEquiv={switchEquiv}
                />
              )}
            </div>
            <div className="reaction-material__delete-header" />
          </div>

          {contents}
        </div>
      )}
    </ReorderableMaterialContainer>
  );
}

function SolventsMaterialGroup({
  materials, materialGroup, getMaterialComponent, headIndex, reaction,
  dropSample, onDrop, onReorder
}) {
  const groupHeaders = { ...headers };
  groupHeaders.group = 'Solvents';
  const addSampleButton = (
    <CreateButton
      disabled={!permitOn(reaction)}
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
      size="xsm"
    />
  );

  const createDefaultSolventsForReaction = ({ value: solvent }) => {
    const smi = solvent.smiles;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        const d = molecule.density;
        const solventDensity = solvent.density || 1;
        molecule.density = (d && d > 0) || solventDensity;
        dropSample(molecule, null, materialGroup, solvent.external_label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const solventOptions = Object.keys(ionic_liquids).reduce((solvents, ionicLiquid) => solvents.concat({
    label: ionicLiquid,
    value: {
      external_label: ionicLiquid,
      smiles: ionic_liquids[ionicLiquid],
      density: 1.0,
      drySolvent: false
    }
  }), defaultMultiSolventsSmilesOptions);

  return (
    <ReorderableMaterialContainer
      materials={materials}
      materialGroup={materialGroup}
      onDrop={onDrop}
      onReorder={onReorder}
      renderMaterial={({ index, ...props }) => getMaterialComponent({
        ...props,
        index: headIndex + index
      })}
    >
      {({
        contents, dropRef, canDrop, isOver
      }) => (
        <div
          ref={dropRef}
          className={materialGroupClassNames({
            isEmpty: materials.length === 0,
            isOver,
            canDrop
          })}
        >
          <div className="pseudo-table__row pseudo-table__row-header">
            <div className="pseudo-table__cell pseudo-table__cell-title">
              <div className="material-group__header-title">
                {addSampleButton}
                {groupHeaders.group}
                <Select
                  value={null}
                  isDisabled={!permitOn(reaction)}
                  options={solventOptions}
                  placeholder="Add"
                  onChange={createDefaultSolventsForReaction}
                  size="xsm"
                />
              </div>
            </div>
            <div title="Dry Solvent" className="reaction-material__dry-solvent-header">DS</div>
            <div className="reaction-material__target-header">{groupHeaders.tr}</div>
            <div className="reaction-material__solvent-label-header">Label</div>
            <div className="reaction-material__solvent-volume-header">Vol</div>
            <div className="reaction-material__volume-ratio-header">Vol ratio</div>
            <div className="reaction-material__delete-header" />
          </div>
          {contents}
        </div>
      )}
    </ReorderableMaterialContainer>
  );
}

MaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  headIndex: PropTypes.number,
  materials: PropTypes.arrayOf(PropTypes.shape).isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  dropMaterial: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool,
  displayYieldField: PropTypes.bool,
  switchYield: PropTypes.func.isRequired
};

GeneralMaterialGroup.propTypes = {
  materials: PropTypes.arrayOf(PropTypes.shape).isRequired,
  materialGroup: PropTypes.string.isRequired,
  dropSample: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  getMaterialComponent: PropTypes.func.isRequired,
  headIndex: PropTypes.number.isRequired,
  showLoadingColumn: PropTypes.bool,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool,
  displayYieldField: PropTypes.bool,
  switchYield: PropTypes.func.isRequired
};

SolventsMaterialGroup.propTypes = {
  materials: PropTypes.arrayOf(PropTypes.shape).isRequired,
  materialGroup: PropTypes.string.isRequired,
  dropSample: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  getMaterialComponent: PropTypes.func.isRequired,
  headIndex: PropTypes.number.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
};

MaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null,
  headIndex: 0,
};

GeneralMaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null
};

export default MaterialGroup;
