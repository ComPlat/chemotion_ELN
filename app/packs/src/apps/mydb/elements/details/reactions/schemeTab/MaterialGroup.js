import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tooltip, OverlayTrigger, Table
} from 'react-bootstrap';
import VirtualizedSelect from 'react-virtualized-select';
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

function MaterialGroup({
  materials, materialGroup, deleteMaterial, onChange,
  showLoadingColumn, reaction, addDefaultSolvent, headIndex,
  dropMaterial, dropSample, switchEquiv, lockEquivColumn
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
    />
  );
}

const switchEquivTooltip = () => (
  <Tooltip id="assign_button">
    Lock/unlock Equiv for target amounts
  </Tooltip>
);

function SwitchEquivButton(lockEquivColumn, switchEquiv) {
  return (
    <OverlayTrigger placement="top" overlay={switchEquivTooltip()}>
      <Button
        id="lock_equiv_column_btn"
        size="xsm"
        variant={lockEquivColumn ? 'warning' : 'light'}
        onClick={switchEquiv}
      >
        <i className={lockEquivColumn ? 'fa fa-lock' : 'fa fa-unlock'} />
      </Button>
    </OverlayTrigger>
  );
}

function GeneralMaterialGroup({
  contents, materialGroup, showLoadingColumn, reaction, addDefaultSolvent,
  switchEquiv, lockEquivColumn
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

  const reagentList = [];
  let reagentDd = <span />;
  const createReagentForReaction = (event) => {
    const smi = event.value;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        molecule.density = molecule.density || 0;
        addDefaultSolvent(molecule, null, materialGroup, event.label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  if (isReactants) {
    headers = { group: 'Reactants' };
    Object.keys(reagents_kombi).forEach((x) => {
      reagentList.push({
        label: x,
        value: reagents_kombi[x]
      });
    });
    reagentDd = (
      <VirtualizedSelect
        disabled={!permitOn(reaction)}
        className="reagents-select"
        name="Reagents"
        multi={false}
        options={reagentList}
        placeholder="Reagents"
        onChange={createReagentForReaction}
      />
    );
  }

  if (materialGroup === 'products') {
    headers.group = 'Products';
    headers.eq = 'Yield';
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
      size="sm"
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
    >
      <i className="fa fa-plus" />
    </Button>
  );

  return (
    <Table responsive className="w-100 borderless">
      <colgroup>
        <col style={{ width: '4%' }} />
        <col
          style={{ width: showLoadingColumn ? '8%' : '15%' }}
        />
        <col style={{ width: '4%' }} />
        <col style={{ width: '2%' }} />
        <col style={{ width: '2%' }} />
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
              <th className="text-center">{refTHead}</th>
              <th className="text-center">{headers.show_label}</th>
              <th className="text-center">{headers.tr}</th>
              <th>
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id="coefficientHeaderTitleReactionScheme">Coefficient</Tooltip>
                  }
                >
                  <span>{headers.reaction_coefficient}</span>
                </OverlayTrigger>
              </th>
              <th className="text-center">{headers.reaction_coefficient}</th>
              <th className="text-center">{headers.amount}</th>
              <th /><th />
              {showLoadingColumn && <th className="text-center">{headers.loading}</th>}
              <th className="text-center">{headers.concn}</th>
              {permitOn(reaction) && (
                <th className="text-center">
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    {headers.eq}
                    {materialGroup !== 'products' && SwitchEquivButton(lockEquivColumn, switchEquiv)}
                  </div>
                </th>
              )}
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {contents.map((item) => item)}
      </tbody>
    </Table>
  );
}

function SolventsMaterialGroup({
  contents, materialGroup, reaction, addDefaultSolvent
}) {
  const addSampleButton = (
    <Button
      disabled={!permitOn(reaction)}
      variant="success"
      size="sm"
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
    >
      <i className="fa fa-plus" />
    </Button>
  );

  const createDefaultSolventsForReaction = (event) => {
    const solvent = event.value;
    // MoleculesFetcher.fetchByMolfile(solvent.molfile)
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
          <th>{addSampleButton}</th>
          <th>
            <VirtualizedSelect
              disabled={!permitOn(reaction)}
              className="solvents-select"
              name="default solvents"
              multi={false}
              options={solventOptions}
              placeholder="Default solvents"
              onChange={createDefaultSolventsForReaction}
            />
          </th>
          <th title="Dry Solvent">DS</th>
          <th>T/R</th>
          <th>Label</th>
          <th>Vol</th>
          <th>Vol ratio</th>
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
  lockEquivColumn: PropTypes.bool
};

GeneralMaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  showLoadingColumn: PropTypes.bool,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  contents: PropTypes.arrayOf(PropTypes.shape).isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool
};

SolventsMaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  contents: PropTypes.arrayOf(PropTypes.shape).isRequired
};

MaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false
};

GeneralMaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false
};

export { MaterialGroup, GeneralMaterialGroup, SolventsMaterialGroup };
