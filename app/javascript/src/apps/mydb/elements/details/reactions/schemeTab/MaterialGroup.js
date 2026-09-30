import React, { useState, useContext } from 'react';
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
import { isSbmmSample } from 'src/utilities/ElementUtils';
import ToggleButton from 'src/components/common/ToggleButton';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ReorderableMaterialContainer
  from 'src/apps/mydb/elements/details/reactions/schemeTab/ReorderableMaterialContainer';
import CreateButton from 'src/components/common/CreateButton';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { components as ReactSelectComponents } from 'react-select';

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

const MaterialGroup = ({
  materials, materialGroup, deleteMaterial, onChange,
  showLoadingColumn, reaction, headIndex,
  dropMaterial, dropSample, dropSbmmSample, switchEquiv, lockEquivColumn, displayYieldField,
  switchYield, dndEnabled, onInitiateMerge, onUnmerge,
}) => {
  const { notifications } = useContext(StoreContext);
  const effectiveDndEnabled = dndEnabled && permitOn(reaction);

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
      onUnmerge={onUnmerge}
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
      if (materialGroup === 'reactants' && dropSbmmSample) {
        dropSbmmSample(item.element, materials.at(index), materialGroup);
      } else {
        // Show notification if trying to drop SBMM into other groups
        notifications.add({
          title: 'Invalid Action',
          message: 'SBMM samples can only be placed in the Reactants group.',
          level: 'warning',
          position: 'tr',
        });
      }
    }
  };

  const MERGEABLE_GROUPS = ['products', 'reactants'];

  const onReorder = (item, index) => {
    const target = materials.at(index);

    if (
      MERGEABLE_GROUPS.includes(materialGroup)
      && item.materialGroup === materialGroup
      && target
      && item.material.id !== target.id
      && !isSbmmSample(item.material)
      && !isSbmmSample(target)
    ) {
      if (item.material.is_legacy) {
        NotificationActions.add({
          message: 'This sample has already been merged.',
          level: 'warning',
          position: 'tr',
        });
        return;
      }
      if (item.material.is_new || target.is_new) {
        NotificationActions.add({
          message: 'Save the reaction before merging materials.',
          level: 'warning',
          position: 'tr',
        });
        return;
      }
      // Show modal instead of pendingMerge confirmation row
      if (onInitiateMerge) {
        onInitiateMerge(item.material, target, materialGroup);
      }
      return;
    }

    dropMaterial(item.material, item.materialGroup, target, materialGroup);
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
        dndEnabled={effectiveDndEnabled}
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
      dndEnabled={effectiveDndEnabled}
    />
  );
};

const SwitchEquivButton = ({ lockEquivColumn, switchEquiv }) => (
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

// Shared factory for per-user localStorage usage tracking.
// Uses label as the storage key so molecules sharing the same SMILES are tracked separately.
function createUsageTracker(storageSuffix) {
  function getKey() {
    const { currentUser } = UserStore.getState();
    if (!currentUser?.id) return null;
    return `user${currentUser.id}-${storageSuffix}`;
  }

  function record({ label, value }) {
    try {
      const key = getKey();
      if (!key) return;
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      const entry = stored[label] || { label, value, count: 0 };
      stored[label] = {
        ...entry,
        label,
        value,
        count: entry.count + 1,
      };
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (_) { /* ignore storage errors */ }
  }

  function getTop(n = 5) {
    try {
      const key = getKey();
      if (!key) return [];
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.values(stored)
        .sort((a, b) => b.count - a.count)
        .slice(0, n)
        .map(({ label, value }) => ({ label, value }));
    } catch (_) { return []; }
  }

  return { record, getTop };
}

const reagentTracker = createUsageTracker('reagent-usage');
const solventTracker = createUsageTracker('solvent-usage');

// Tab counts are computed from react-select's live inputValue to avoid
// the 1-frame lag that occurs when tracking inputValue in component state.
const ReagentMenuList = ({ children, selectProps, ...menuListProps }) => {
  const {
    hasMostUsed, activeTab, onSetActiveTab, allTabLabel,
    inputValue, allOptions, topOptions, filterFn,
  } = selectProps;
  const tabs = hasMostUsed ? ['all', 'mostUsed'] : ['all'];
  const tabLabels = { mostUsed: 'Most Used', all: allTabLabel || 'All Reagents' };
  const tabCounts = filterFn ? {
    all: (allOptions || []).filter((o) => filterFn(o, inputValue)).length,
    mostUsed: (topOptions || []).filter((o) => filterFn(o, inputValue)).length,
  } : null;
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <ReactSelectComponents.MenuList selectProps={selectProps} {...menuListProps}>
      <div className="reagent-group__tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`reagent-group__tab${activeTab === tab ? ' reagent-group__tab--active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSetActiveTab(tab)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSetActiveTab(tab); } }}
          >
            {tabLabels[tab]}
            {tabCounts?.[tab] != null && (
              <span className="reagent-group__tab-count">
                {`(${tabCounts[tab]})`}
              </span>
            )}
          </button>
        ))}
      </div>
      {children}
    </ReactSelectComponents.MenuList>
  );
};

ReagentMenuList.propTypes = {
  children: PropTypes.node.isRequired,
  selectProps: PropTypes.shape({
    hasMostUsed: PropTypes.bool,
    activeTab: PropTypes.string,
    onSetActiveTab: PropTypes.func,
    allTabLabel: PropTypes.string,
    inputValue: PropTypes.string,
    allOptions: PropTypes.arrayOf(PropTypes.shape({})),
    topOptions: PropTypes.arrayOf(PropTypes.shape({})),
    filterFn: PropTypes.func,
  }).isRequired,
};

const GeneralMaterialGroup = ({
  materials, materialGroup, getMaterialComponent, headIndex,
  dropSample, onDrop, onReorder,
  showLoadingColumn, reaction,
  switchEquiv, lockEquivColumn, displayYieldField, switchYield, dndEnabled
}) => {
  const isReactants = materialGroup === 'reactants';
  const isInteractionReaction = reaction.isInteractionReaction();
  const isInteractionProducts = isInteractionReaction && materialGroup === 'products';
  const groupHeaders = { ...headers };
  const [activeTab, setActiveTab] = useState('all');
  const [topReagents, setTopReagents] = useState(() => reagentTracker.getTop());

  let reagentDd = null;
  if (isReactants) {
    groupHeaders.group = isInteractionReaction ? 'Additives' : 'Reactants';

    const reagentList = Object.keys(reagents_kombi).map((x) => ({
      label: x,
      value: reagents_kombi[x]
    }));

    const createReagentForReaction = ({ label, value: smi }) => {
      reagentTracker.record({ label, value: smi });
      setTopReagents(reagentTracker.getTop());
      MoleculesFetcher.fetchBySmi(smi)
        .then((result) => {
          const molecule = new Molecule(result);
          molecule.density = molecule.density || 0;
          dropSample(molecule, null, materialGroup, label);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };

    const filterReagents = (option, inputValue) => {
      if (!inputValue) return true;
      const normalizedInput = inputValue.replace(/\s+/g, '');
      const normalizedLabel = option.label.replace(/\s+/g, '');
      return normalizedLabel.toLowerCase().includes(normalizedInput.toLowerCase());
    };

    const effectiveTab = topReagents.length > 0 ? activeTab : 'all';
    const selectOptions = effectiveTab === 'mostUsed' ? topReagents : reagentList;

    reagentDd = (
      <Select
        isDisabled={!permitOn(reaction)}
        options={selectOptions}
        value={null}
        placeholder="Add reagent..."
        onChange={createReagentForReaction}
        filterOption={filterReagents}
        hasMostUsed={topReagents.length > 0}
        activeTab={effectiveTab}
        onSetActiveTab={setActiveTab}
        allOptions={reagentList}
        topOptions={topReagents}
        filterFn={filterReagents}
        components={{ MenuList: ReagentMenuList }}
        classNames={{ menu: () => 'reagent-menu' }}
        size="xsm"
      />
    );
  }

  if (materialGroup === 'starting_materials' && isInteractionReaction) {
    groupHeaders.group = 'Guest and host';
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
        tooltipOn={conversionText}
        tooltipOff={yieldText}
        size="xsm"
      />
    );
  };

  if (materialGroup === 'products') {
    groupHeaders.group = 'Products';
    if (!isInteractionReaction) {
      groupHeaders.eq = yieldConversionRateFields();
    }
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
      dndEnabled={dndEnabled}
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
            <div className="reaction-material__concentration-header d-flex align-items-center">
              {groupHeaders.concn}
              {materialGroup === 'products' && reaction.gaseous && (
                <OverlayTrigger
                  placement="top"
                  overlay={(
                    <Tooltip id="concentration-header-info">
                      Concentration calculated assuming a temperature of 25 °C
                    </Tooltip>
                  )}
                >
                  <i className="ms-1 fa fa-info-circle" />
                </OverlayTrigger>
              )}
            </div>
            {!isInteractionProducts && (
              <div className="reaction-material__equivalent-header">
                {groupHeaders.eq}
                {materialGroup === 'starting_materials' && (
                  <SwitchEquivButton
                    lockEquivColumn={lockEquivColumn}
                    switchEquiv={switchEquiv}
                  />
                )}
              </div>
            )}
            <div className="reaction-material__delete-header" />
          </div>

          {contents}
        </div>
      )}
    </ReorderableMaterialContainer>
  );
};

const SolventsMaterialGroup = ({
  materials, materialGroup, getMaterialComponent, headIndex, reaction,
  dropSample, onDrop, onReorder, dndEnabled
}) => {
  const groupHeaders = { ...headers };
  groupHeaders.group = 'Solvents';
  const [activeTab, setActiveTab] = useState('all');
  const [topSolvents, setTopSolvents] = useState(() => solventTracker.getTop());

  const addSampleButton = (
    <CreateButton
      disabled={!permitOn(reaction)}
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
      size="xsm"
    />
  );

  const createDefaultSolventsForReaction = ({ label, value: solvent }) => {
    solventTracker.record({ label, value: solvent });
    setTopSolvents(solventTracker.getTop());
    const smi = solvent.smiles;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        const d = molecule.density;
        const solventDensity = solvent.density || 1;
        molecule.density = (d > 0) ? d : solventDensity;
        dropSample(molecule, null, materialGroup, solvent.external_label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const allSolventOptions = Object.keys(ionic_liquids).reduce((solvents, ionicLiquid) => solvents.concat({
    label: ionicLiquid,
    value: {
      external_label: ionicLiquid,
      smiles: ionic_liquids[ionicLiquid],
      density: 1.0,
      drySolvent: false
    }
  }), defaultMultiSolventsSmilesOptions);

  const filterSolvents = (option, inputValue) => {
    if (!inputValue) return true;
    const normalizedInput = inputValue.replace(/\s+/g, '');
    const normalizedLabel = option.label.replace(/\s+/g, '');
    return normalizedLabel.toLowerCase().includes(normalizedInput.toLowerCase());
  };

  const effectiveTab = topSolvents.length > 0 ? activeTab : 'all';
  const solventOptions = effectiveTab === 'mostUsed' ? topSolvents : allSolventOptions;

  return (
    <ReorderableMaterialContainer
      materials={materials}
      materialGroup={materialGroup}
      onDrop={onDrop}
      onReorder={onReorder}
      dndEnabled={dndEnabled}
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
                  isDisabled={!permitOn(reaction)}
                  options={solventOptions}
                  value={null}
                  placeholder="Add solvent..."
                  onChange={createDefaultSolventsForReaction}
                  filterOption={filterSolvents}
                  hasMostUsed={topSolvents.length > 0}
                  activeTab={effectiveTab}
                  onSetActiveTab={setActiveTab}
                  allOptions={allSolventOptions}
                  topOptions={topSolvents}
                  filterFn={filterSolvents}
                  allTabLabel="All Solvents"
                  components={{ MenuList: ReagentMenuList }}
                  classNames={{ menu: () => 'solvent-menu' }}
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
};

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
  switchYield: PropTypes.func.isRequired,
  dndEnabled: PropTypes.bool,
  onInitiateMerge: PropTypes.func,
  onUnmerge: PropTypes.func,
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
  switchYield: PropTypes.func.isRequired,
  dndEnabled: PropTypes.bool,
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
  dndEnabled: PropTypes.bool,
};

SolventsMaterialGroup.defaultProps = {
  dndEnabled: true,
};

MaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null,
  headIndex: 0,
  dndEnabled: true,
  onInitiateMerge: null,
  onUnmerge: null,
};

GeneralMaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null,
  dndEnabled: true,
  onInitiateMerge: null,
  onUnmerge: null,
};

export default MaterialGroup;
