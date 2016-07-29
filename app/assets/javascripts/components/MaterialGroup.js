import React, {Component, PropTypes} from 'react';
import Material from './Material';
import MaterialCalculations from './MaterialCalculations'
import {Table} from 'react-bootstrap';

export default class MaterialGroup extends Component {
  render() {
    const {materials, materialGroup, deleteMaterial, onChange, showLoadingColumn} = this.props;
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
          />)
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
        ? <SolventsMaterialGroup contents={contents} />
        : <GeneralMaterialGroup contents={contents}
                                materialGroup={materialGroup}
                                showLoadingColumn={showLoadingColumn} />
    )
  }
}

const GeneralMaterialGroup = ({contents, materialGroup, showLoadingColumn}) => {
  const loadingTHead = (showLoadingColumn) => {
    if(showLoadingColumn) {
      return <th width="15%">Loading</th>;
    } else {
      return false;
    }
  }

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <thead><tr>
        <th width="5%"></th>
        <th width="5%">Ref</th>
        <th width="14%">Name</th>
        <th width="5%">T/R</th>
        <th width="14%">Mass</th>
        <th width={showLoadingColumn ? "11%" : "13%"}>Vol</th>
        <th width={showLoadingColumn ? "16%" : "13%"}>Amount</th>
        {loadingTHead(showLoadingColumn)}
        <th width="10%">{materialGroup == 'products' ? 'Yield' : 'Equiv'}</th>
        <th width="5%"></th>
        </tr></thead>
        <tbody>
          {contents.map( item => item )}
        </tbody>
      </table>
    </div>
  )
}

const SolventsMaterialGroup = ({contents}) => {
  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <thead><tr>
        <th width="5%"></th>
        <th width="14%">Name</th>
        <th width="5%">T/R</th>
        <th width="27%">Label</th>
        <th width="16%">Vol</th>
        <th width="12%">Vol ratio</th>
        <th width="5%"></th>
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
  deleteMaterial: PropTypes.func.isRequired
};
