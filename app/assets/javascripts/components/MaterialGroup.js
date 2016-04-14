import React, {Component, PropTypes} from 'react';
import Material from './Material';
import MaterialCalculations from './MaterialCalculations'

export default class MaterialGroup extends Component {

  loadingTHead(showLoadingColumn) {
    if(showLoadingColumn) {
      return <th width="15%">Loading</th>;
    } else {
      return false;
    }
  }

  render() {
    const {materials, materialGroup, deleteMaterial, onChange, showLoadingColumn} = this.props;
    let contents = [];

    materials.map((material, key) => {
      contents.push(
        (<Material
          onChange={onChange}
          key={key}
          material={material}
          materialGroup={materialGroup}
          showLoadingColumn={showLoadingColumn}
          deleteMaterial={material => deleteMaterial(material, materialGroup)}
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
      <div>
        <table width="100%">
          <thead><tr>
          <th width="5%"></th>
          <th width="5%">Ref</th>
          <th width="14%">Name</th>
          <th width="5%">T/R</th>
          <th width="14%">Mass</th>
          <th width={showLoadingColumn ? "11%" : "13%"}>Vol</th>
          <th width={showLoadingColumn ? "16%" : "13%"}>Amount</th>
          {this.loadingTHead(showLoadingColumn)}
          <th width="10%">{materialGroup == 'products' ? 'Yield' : 'Equiv'}</th>
          <th width="5%"></th>
          </tr></thead>
          <tbody>
            {contents.map(function(item) {
              return item;
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

MaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  materials: PropTypes.array.isRequired,
  deleteMaterial: PropTypes.func.isRequired
};
