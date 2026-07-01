import React, { useState } from 'react';
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

function MaterialGroup({
  materials, materialGroup, deleteMaterial, onChange,
  showLoadingColumn, reaction, headIndex,
  dropMaterial, dropSample, dropSbmmSample, switchEquiv, lockEquivColumn, displayYieldField,
  switchYield, dndEnabled
}) {
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
          title: 'Invalid Action',
          message: 'SBMM samples can only be placed in the Reactants group.',
          level: 'warning',
          dismissible: 'button',
          position: 'tr',
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

function getReagentUsageKey() {
  const { currentUser } = UserStore.getState();
  return `user${currentUser?.id}-reagent-usage`;
}

function recordReagentUsage({ label, value }) {
  try {
    const key = getReagentUsageKey();
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const entry = stored[value] || { label, value, count: 0 };
    stored[value] = { ...entry, count: entry.count + 1 };
    localStorage.setItem(key, JSON.stringify(stored));
  } catch (_) { /* ignore storage errors */ }
}

function getTopReagents(n = 5) {
  try {
    const key = getReagentUsageKey();
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.values(stored)
      .sort((a, b) => b.count - a.count)
      .slice(0, n)
      .map(({ label, value }) => ({ label, value }));
  } catch (_) { return []; }
}

function getSolventUsageKey() {
  const { currentUser } = UserStore.getState();
  return `user${currentUser?.id}-solvent-usage`;
}

function recordSolventUsage({ label, value }) {
  try {
    const key = getSolventUsageKey();
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const storageKey = value?.smiles || label;
    const entry = stored[storageKey] || { label, value, count: 0 };
    stored[storageKey] = { ...entry, count: entry.count + 1 };
    localStorage.setItem(key, JSON.stringify(stored));
  } catch (_) { /* ignore storage errors */ }
}

function getTopSolvents(n = 5) {
  try {
    const key = getSolventUsageKey();
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    return Object.values(stored)
      .sort((a, b) => b.count - a.count)
      .slice(0, n)
      .map(({ label, value }) => ({ label, value }));
  } catch (_) { return []; }
}

/* eslint-disable react/prop-types */
function ReagentMenuList({ children, selectProps, ...menuListProps }) {
  const {
    hasMostUsed, activeTab, onSetActiveTab, tabCounts, allTabLabel,
  } = selectProps;
  const tabs = hasMostUsed ? ['allReagents', 'mostUsed'] : ['allReagents'];
  const tabLabels = { mostUsed: 'Most Used', allReagents: allTabLabel || 'All Reagents' };
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <ReactSelectComponents.MenuList selectProps={selectProps} {...menuListProps}>
      <div className="reagent-group__tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`reagent-group__tab${activeTab === tab ? ' reagent-group__tab--active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSetActiveTab(tab)}
            onKeyDown={(e) => e.key === 'Enter' && onSetActiveTab(tab)}
          >
            {tabLabels[tab]}
            {tabCounts?.[tab] != null && (
              <span className="reagent-group__tab-count">
                (
                {tabCounts[tab]}
                )
              </span>
            )}
          </button>
        ))}
      </div>
      {children}
    </ReactSelectComponents.MenuList>
  );
}
/* eslint-enable react/prop-types */

function GeneralMaterialGroup({
  materials, materialGroup, getMaterialComponent, headIndex,
  dropSample, onDrop, onReorder,
  showLoadingColumn, reaction,
  switchEquiv, lockEquivColumn, displayYieldField, switchYield, dndEnabled
}) {
  const isReactants = materialGroup === 'reactants';
  const isInteractionReaction = reaction.isInteractionReaction();
  const isInteractionProducts = isInteractionReaction && materialGroup === 'products';
  const groupHeaders = { ...headers };
  const [activeTab, setActiveTab] = useState('allReagents');
  const [searchInput, setSearchInput] = useState('');

  let reagentDd = null;
  if (isReactants) {
    groupHeaders.group = isInteractionReaction ? 'Additives' : 'Reactants';

    const reagentList = Object.keys(reagents_kombi).map((x) => ({
      label: x,
      value: reagents_kombi[x]
    }));

    const createReagentForReaction = ({ label, value: smi }) => {
      recordReagentUsage({ label, value: smi });
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

    const topReagents = getTopReagents();
    const effectiveTab = topReagents.length > 0 ? activeTab : 'allReagents';
    const selectOptions = effectiveTab === 'mostUsed' ? topReagents : reagentList;
    const visibleTop = topReagents.filter((r) => filterReagents(r, searchInput));
    const visibleAll = reagentList.filter((r) => filterReagents(r, searchInput));

    reagentDd = (
      <Select
        isDisabled={!permitOn(reaction)}
        options={selectOptions}
        value={null}
        placeholder="Add reagent..."
        onChange={createReagentForReaction}
        filterOption={filterReagents}
        onInputChange={(val) => setSearchInput(val)}
        hasMostUsed={topReagents.length > 0}
        activeTab={effectiveTab}
        onSetActiveTab={setActiveTab}
        tabCounts={{ allReagents: visibleAll.length, mostUsed: visibleTop.length }}
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
            <div className="reaction-material__concentration-header">{groupHeaders.concn}</div>
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
}

function SolventsMaterialGroup({
  materials, materialGroup, getMaterialComponent, headIndex, reaction,
  dropSample, onDrop, onReorder, dndEnabled
}) {
  const groupHeaders = { ...headers };
  groupHeaders.group = 'Solvents';
  const [activeTab, setActiveTab] = useState('allReagents');
  const [searchInput, setSearchInput] = useState('');

  const addSampleButton = (
    <CreateButton
      disabled={!permitOn(reaction)}
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
      size="xsm"
    />
  );

  const createDefaultSolventsForReaction = ({ label, value: solvent }) => {
    recordSolventUsage({ label, value: solvent });
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

  const topSolvents = getTopSolvents();
  const effectiveTab = topSolvents.length > 0 ? activeTab : 'allReagents';
  const solventOptions = effectiveTab === 'mostUsed' ? topSolvents : allSolventOptions;
  const visibleTop = topSolvents.filter((s) => filterSolvents(s, searchInput));
  const visibleAll = allSolventOptions.filter((s) => filterSolvents(s, searchInput));

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
                  onInputChange={(val) => setSearchInput(val)}
                  hasMostUsed={topSolvents.length > 0}
                  activeTab={effectiveTab}
                  onSetActiveTab={setActiveTab}
                  tabCounts={{ allReagents: visibleAll.length, mostUsed: visibleTop.length }}
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
  switchYield: PropTypes.func.isRequired,
  dndEnabled: PropTypes.bool,
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

MaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null,
  headIndex: 0,
  dndEnabled: true,
};

GeneralMaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null,
  dndEnabled: true,
};

export default MaterialGroup;
