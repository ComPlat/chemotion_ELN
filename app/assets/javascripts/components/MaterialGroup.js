import React, {Component, PropTypes} from 'react';
import Material from './Material';
import MaterialCalculations from './MaterialCalculations'
import {Button, Glyphicon} from 'react-bootstrap';
import ElementActions from './actions/ElementActions';
import MoleculesFetcher from './fetchers/MoleculesFetcher';
import Molecule from './models/Molecule';
import Select from 'react-select';
import { defaultMultiSolventsOptions } from './staticDropdownOptions/options'

export default class MaterialGroup extends Component {

  render() {
    const { materials, materialGroup, deleteMaterial, onChange, showLoadingColumn,
            reaction, addDefaultSolvent } = this.props;
    let contents = [];

    materials.map((material, key) => {
      contents.push(
        (<Material
          reaction={reaction}
          onChange={onChange}
          key={key}
          material={material}
          materialGroup={materialGroup}
          showLoadingColumn={showLoadingColumn}
          deleteMaterial={material => deleteMaterial(material, materialGroup)} />)
      );

      if(materialGroup == 'products' && material.adjusted_loading && material.error_mass)
        contents.push(
          (<MaterialCalculations
            material={material}
            materialGroup={materialGroup}
            />)
        );
    })

    return (
      materialGroup === 'solvents'
        ? <SolventsMaterialGroup contents={contents}
                                 materialGroup={materialGroup}
                                 reaction={reaction}
                                 addDefaultSolvent={addDefaultSolvent} />
        : <GeneralMaterialGroup contents={contents}
                                materialGroup={materialGroup}
                                showLoadingColumn={showLoadingColumn}
                                reaction={reaction} />
    )
  }
}

const GeneralMaterialGroup = ({contents, materialGroup, showLoadingColumn,reaction}) => {

  let headers = {
    ref: 'Ref',
    group: 'Starting materials',
    tr: 'T/R',
    mass: 'Mass',
    amount: 'Amount',
    loading: 'Loading',
    vol: 'Vol',
    eq: 'Equiv',
  }

  if (materialGroup == 'reactants') {
    headers = {group: 'Reactants'}
  }

  if (materialGroup == 'products') {
    headers.group = 'Products'
    headers.eq = 'Yield'
  }

  let loadingTHead = (showLoadingColumn) ? <th width="15%">{headers.loading}</th> : null;
  let refTHead = (materialGroup != 'products') ? <th width="4%">{headers.ref}</th> : null;
  /**
   * Add a (not yet persisted) sample to a material group
   * of the given reaction
   */
  let addSampleButton = <Button bsStyle="success" bsSize="xs"
    onClick={() => ElementActions.addSampleToMaterialGroup({reaction,materialGroup})}>
      <Glyphicon glyph="plus" />
  </Button>

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <thead><tr>
        <th width="4%">{addSampleButton}</th>
        <th width="15%">{headers.group}</th>
        {refTHead}
        <th width="3%">{headers.tr}</th>
        <th width="10%">{headers.amount}</th>
        <th width={showLoadingColumn ? "8%" : "10%"}></th>
        <th width={showLoadingColumn ? "13%" : "12%"}></th>
        {loadingTHead}
        <th width="12%">{headers.concn}</th>
        <th width="9%">{headers.eq}</th>
        <th width="4%"></th>
        </tr></thead>
        <tbody>
          {contents.map( item => item )}
        </tbody>
      </table>
    </div>
  )
}

const SolventsMaterialGroup = ({contents, materialGroup, reaction, addDefaultSolvent}) => {
  let addSampleButton = <Button bsStyle="success" bsSize="xs"
    onClick={() => ElementActions.addSampleToMaterialGroup({reaction, materialGroup})}>
      <Glyphicon glyph="plus" />
  </Button>

  const createDefaultSolventsForReaction = (external_label, molfile) => {
    MoleculesFetcher.fetchByMolfile(molfile)
      .then((result) => {
        const molecule = new Molecule(result);
        addDefaultSolvent(molecule, materialGroup, external_label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <thead><tr>
        <th width="4%">{addSampleButton}</th>
        <th width="21%">
          <Select
            className='solvents-select'
            name='default solvents'
            multi={false}
            options={defaultMultiSolventsOptions}
            placeholder='Default solvents'
            onChange={ (e) => { createDefaultSolventsForReaction(e[0], e[1]) }} />
        </th>
        <th width="4%">T/R</th>
        <th width="26%">Label</th>
        <th width="13%">Vol</th>
        <th width="13%">Vol ratio</th>
        <th width="3%"></th>
        </tr></thead>
        <tbody>
          {contents.map( item => item )}
        </tbody>
      </table>
    </div>
  )
}

MaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  materials: PropTypes.array.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.object,
  reaction: PropTypes.object.isRequired,
  addDefaultSolvent: PropTypes.func,
};
