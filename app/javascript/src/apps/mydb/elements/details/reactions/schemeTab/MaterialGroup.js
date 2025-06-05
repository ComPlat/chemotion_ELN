import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tooltip, OverlayTrigger, Table
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
import ReorderableMaterialContainer from 'src/apps/mydb/elements/details/reactions/schemeTab/ReorderableMaterialContainer';

function MaterialGroup({
  materials, materialGroup, deleteMaterial, onChange,
  showLoadingColumn, reaction, headIndex,
  dropMaterial, dropSample, switchEquiv, lockEquivColumn, displayYieldField,
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
  let headers = {
    ref: 'Ref',
    group: 'Starting materials',
    tr: 'T/R',
    mass: 'Mass',
    reaction_coefficient: 'Coef',
    amount: 'Amount',
    loading: 'Loading',
    concn: 'Conc',
    vol: 'Vol',
    eq: 'Equiv'
  };

  let reagentDd = null;
  if (isReactants) {
    headers = { group: 'Reactants' };

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
        className="mb-2"
        options={reagentList}
        placeholder="Reagents"
        onChange={createReagentForReaction}
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
        buttonClass="px-2 py-1"
      />
    );
  };

  if (materialGroup === 'products') {
    headers.group = 'Products';
    headers.eq = yieldConversionRateFields();
  }

  const refTHead = (materialGroup !== 'products') ? headers.ref : null;
  /**
   * Add a (not yet persisted) sample to a material group
   * of the given reaction
   */
  const addSampleButton = (
    <Button
      disabled={!permitOn(reaction)}
      variant="success"
      size="xsm"
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
    >
      <i className="fa fa-plus" />
    </Button>
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
        <Table
          borderless
          ref={dropRef}
          className={materialGroupClassNames({
            isEmpty: materials.length === 0,
            isOver,
            canDrop
          })}
        >
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: showLoadingColumn ? '8%' : '15%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: showLoadingColumn ? '3%' : '4%' }} />
            <col style={{ width: showLoadingColumn ? '10%' : '11%' }} />
            {showLoadingColumn && <col style={{ width: '11%' }} />}
            <col style={{ width: showLoadingColumn ? '10%' : '11%' }} />
            <col style={{ width: showLoadingColumn ? '12%' : '13%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>{addSampleButton}</th>
              <th>{headers.group}</th>

              {isReactants ? (
                <th colSpan={showLoadingColumn ? 8 : 7}>{reagentDd}</th>
              ) : (
                <>
                  <th>{refTHead}</th>
                  <th>{headers.tr}</th>
                  <th>
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip id="coefficientHeaderTitleReactionScheme">Coefficient</Tooltip>}
                    >
                      <span>{headers.reaction_coefficient}</span>
                    </OverlayTrigger>
                  </th>
                  <th colSpan="3">{headers.amount}</th>
                  {showLoadingColumn && <th>{headers.loading}</th>}
                  <th>{headers.concn}</th>
                  {!isReactants && (
                    <th>
                      {headers.eq}
                      {materialGroup !== 'products' && (
                        <SwitchEquivButton
                          lockEquivColumn={lockEquivColumn}
                          switchEquiv={switchEquiv}
                        />
                      )}
                    </th>
                  )}
                </>
              )}
            </tr>
          </thead>

          {contents}
        </Table>
      )}
    </ReorderableMaterialContainer>
  );
}

function SolventsMaterialGroup({
  materials, materialGroup, getMaterialComponent, headIndex, reaction,
  dropSample, onDrop, onReorder
}) {
  const addSampleButton = (
    <Button
      disabled={!permitOn(reaction)}
      variant="success"
      size="xsm"
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
    >
      <i className="fa fa-plus" />
    </Button>
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
        <Table
          borderless
          ref={dropRef}
          className={materialGroupClassNames({
            isEmpty: materials.length === 0,
            isOver,
            canDrop
          })}
        >
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '2%' }} />
            <col style={{ width: '2%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '2%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="align-middle">{addSampleButton}</th>
              <th className="d-flex flex-row align-items-center gap-2">
                Solvents
                <div className="flex-grow-1">
                  <Select
                    value={null}
                    isDisabled={!permitOn(reaction)}
                    options={solventOptions}
                    placeholder="Add default"
                    onChange={createDefaultSolventsForReaction}
                  />
                </div>
              </th>
              <th title="Dry Solvent" className="align-middle">DS</th>
              <th className="align-middle">T/R</th>
              <th className="align-middle">Label</th>
              <th className="align-middle">Vol</th>
              <th className="align-middle">Vol ratio</th>
            </tr>
          </thead>
          <tbody>
            {contents}
          </tbody>
        </Table>
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
