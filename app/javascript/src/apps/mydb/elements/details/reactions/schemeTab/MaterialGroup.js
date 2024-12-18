import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tooltip, OverlayTrigger, Table
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import MaterialCalculations from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialCalculations';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import Molecule from 'src/models/Molecule';
import Reaction from 'src/models/Reaction';
import { defaultMultiSolventsSmilesOptions } from 'src/components/staticDropdownOptions/options';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import { reagents_kombi } from 'src/components/staticDropdownOptions/reagents_kombi';
import { permitOn } from 'src/components/common/uis';
import ToggleButton from 'src/components/common/ToggleButton';

function MaterialGroup({
  materials, materialGroup, deleteMaterial, onChange,
  showLoadingColumn, reaction, addDefaultSolvent, headIndex,
  dropMaterial, dropSample, switchEquiv, lockEquivColumn, displayYieldField,
  switchYield
}) {
  const contents = [];
  let index = headIndex;
  if (materials && materials.length > 0) {
    materials.forEach((material) => {
      index += 1;
      contents.push((
        <Material
          reaction={reaction}
          onChange={onChange}
          key={material.id}
          material={material}
          materialGroup={materialGroup}
          showLoadingColumn={showLoadingColumn}
          deleteMaterial={(m) => deleteMaterial(m, materialGroup)}
          index={index}
          dropMaterial={dropMaterial}
          dropSample={dropSample}
          lockEquivColumn={lockEquivColumn}
          displayYieldField={displayYieldField}
        />
      ));

      if (materialGroup === 'products'
        && material.adjusted_loading
        && material.error_mass) {
        contents.push((
          <MaterialCalculations
            material={material}
            materialGroup={materialGroup}
            index={index}
          />
        ));
      }
    });
  }

  if (materialGroup === 'solvents'
    || materialGroup === 'purification_solvents') {
    return (
      <SolventsMaterialGroup
        contents={contents}
        materialGroup={materialGroup}
        reaction={reaction}
        addDefaultSolvent={addDefaultSolvent}
      />
    );
  }

  return (
    <GeneralMaterialGroup
      contents={contents}
      materialGroup={materialGroup}
      showLoadingColumn={showLoadingColumn}
      reaction={reaction}
      addDefaultSolvent={addDefaultSolvent}
      switchEquiv={switchEquiv}
      lockEquivColumn={lockEquivColumn}
      displayYieldField={displayYieldField}
      switchYield={switchYield}
    />
  );
}

const switchEquivTooltip = () => (
  <Tooltip id="assign_button">
    Lock/unlock Equiv
    <br />
    for target amounts
  </Tooltip>
);

function SwitchEquivButton(lockEquivColumn, switchEquiv) {
  return (
    <OverlayTrigger placement="top" overlay={switchEquivTooltip()}>
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

function GeneralMaterialGroup({
  contents, materialGroup, showLoadingColumn, reaction, addDefaultSolvent,
  switchEquiv, lockEquivColumn, displayYieldField, switchYield
}) {
  const isReactants = materialGroup === 'reactants';
  let headers = {
    ref: 'Ref',
    group: 'Starting materials',
    show_label: 'L/S',
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
          addDefaultSolvent(molecule, null, materialGroup, label);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };

    reagentDd = (
      <Select
        isDisabled={!permitOn(reaction)}
        className="mb-2"
        options={reagentList}
        placeholder="Reagents"
        onChange={createReagentForReaction}
      />
    );
  }

  const yieldConversionRateFields = () => {
    const conversionText = 'Click to switch to conversion field.'
    + ' The conversion will not be displayed as part of the reaction scheme';
    const yieldText = 'Click to switch to yield field.'
    + ' The yield will be displayed as part of the reaction scheme';
    return (
      <div>
        <ToggleButton
          isToggledInitial={displayYieldField}
          onToggle={switchYield}
          onLabel="Yield"
          offLabel="Conv."
          onColor="transparent"
          offColor="transparent"
          tooltipOn={conversionText}
          tooltipOff={yieldText}
          fontSize="14px"
          fontWeight="bold"
        />
      </div>
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
    <table className="w-100 m-2">
      <colgroup>
        <col style={{ width: '4%' }} />
        <col style={{ width: showLoadingColumn ? '8%' : '15%' }} />
        <col style={{ width: '4%' }} />
        <col style={{ width: '3%' }} />
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
            <th colSpan={showLoadingColumn ? 9 : 8}>{reagentDd}</th>
          ) : (
            <>
              <th>{refTHead}</th>
              <th>{headers.show_label}</th>
              <th>{headers.tr}</th>
              <th>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="coefficientHeaderTitleReactionScheme">Coefficient</Tooltip>}
                >
                  <span>{headers.reaction_coefficient}</span>
                </OverlayTrigger>
              </th>
              <th>{headers.amount}</th>
              <th />
              <th />
              {showLoadingColumn && <th>{headers.loading}</th>}
              <th>{headers.concn}</th>
              {!isReactants && (
                <th>
                  {headers.eq}
                  {materialGroup !== 'products' && SwitchEquivButton(lockEquivColumn, switchEquiv)}
                </th>
              )}
            </>
          )}
        </tr>
      </thead>
      {contents}
    </table>
  );
}

function SolventsMaterialGroup({
  contents, materialGroup, reaction, addDefaultSolvent
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
        addDefaultSolvent(molecule, null, materialGroup, solvent.external_label);
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
    <Table borderless className="w-100">
      <thead>
        <tr>
          <th className="align-middle">{addSampleButton}</th>
          <th className="align-middle">
            <Select
              isDisabled={!permitOn(reaction)}
              options={solventOptions}
              placeholder="Default solvents"
              onChange={createDefaultSolventsForReaction}
            />
          </th>
          <th title="Dry Solvent" className="align-middle">DS</th>
          <th className="align-middle">T/R</th>
          <th className="align-middle">Label</th>
          <th className="align-middle">Vol</th>
          <th className="align-middle">Vol ratio</th>
        </tr>
      </thead>
      <tbody>
        {contents.map((item) => item)}
      </tbody>
    </Table>
  );
}

MaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  headIndex: PropTypes.number.isRequired,
  materials: PropTypes.arrayOf(PropTypes.shape).isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool,
  displayYieldField: PropTypes.bool,
  switchYield: PropTypes.func.isRequired
};

GeneralMaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  showLoadingColumn: PropTypes.bool,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  contents: PropTypes.arrayOf(PropTypes.shape).isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool,
  displayYieldField: PropTypes.bool,
  switchYield: PropTypes.func.isRequired
};

SolventsMaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  contents: PropTypes.arrayOf(PropTypes.shape).isRequired
};

MaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: true
};

GeneralMaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: true
};

export { MaterialGroup, GeneralMaterialGroup, SolventsMaterialGroup };
