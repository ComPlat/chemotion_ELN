import React, {Component, PropTypes} from 'react';
import Material from './Material';
import MaterialCalculations from './MaterialCalculations'
import {Button, Glyphicon} from 'react-bootstrap';
import ElementActions from './actions/ElementActions';

export default class MaterialGroup extends Component {

  render() {
    const { materials, materialGroup, deleteMaterial, onChange, showLoadingColumn,
            reaction, totalVolume } = this.props;
    let contents = [];
    let solventsVolSum = 0.0;

    if(materialGroup === 'solvents') {
      materials.map(material => {
        if(material.amountType === 'real') {
          solventsVolSum += material.real_amount_value;
        } else {
          solventsVolSum += material.target_amount_value;
        }
      })
    }

    materials.map((material, key) => {
      contents.push(
        (<Material
          onChange={onChange}
          key={key}
          material={material}
          materialGroup={materialGroup}
          showLoadingColumn={showLoadingColumn}
          deleteMaterial={material => deleteMaterial(material, materialGroup)}
          solventsVolSum={solventsVolSum}
          totalVolume={totalVolume} />)
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
                                 reaction={reaction} />
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
    concentration: 'Concentration',
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
        <th width="17%">{headers.group}</th>
        <th width="4%">{headers.ref}</th>
        <th width="4%">{headers.tr}</th>
        <th width="14%">{headers.amount}</th>
        <th width={showLoadingColumn ? "11%" : "13%"}></th>
        <th width={showLoadingColumn ? "16%" : "13%"}>{headers.concentration}</th>
        {loadingTHead}
        <th width="11%">{headers.eq}</th>
        <th width="4%"></th>
        </tr></thead>
        <tbody>
          {contents.map( item => item )}
        </tbody>
      </table>
    </div>
  )
}

const SolventsMaterialGroup = ({contents, materialGroup, reaction}) => {
  let addSampleButton = <Button bsStyle="success" bsSize="xs"
    onClick={() => ElementActions.addSampleToMaterialGroup({reaction, materialGroup})}>
      <Glyphicon glyph="plus" />
  </Button>

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <thead><tr>
        <th width="4%">{addSampleButton}</th>
        <th width="21%">Solvents</th>
        <th width="4%">T/R</th>
        <th width="27%">Label</th>
        <th width="13%">Vol</th>
        <th width="11%">Vol ratio</th>
        <th width="4%"></th>
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
  totalVolume: PropTypes.number.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.object,
  reaction: PropTypes.object.isRequired,
};
