import React, {Component, PropTypes} from 'react';
import Material from './Material';

export default class MaterialGroup extends Component {
  render() {
    const {materials, materialGroup, deleteMaterial} = this.props;
    return (
      <div>
        <table width="100%">
          <thead>
          <th width="5%"></th>
          <th width="5%">Ref</th>
          <th width="20%">Name</th>
          <th width="20%">Molecule</th>
          <th width="25%">Amount</th>
          <th width="20%">Equi</th>
          <th width="5%"></th>
          </thead>
          <tbody>
          {
            materials.map((material, key) => {
              return (
                <Material
                  key={key}
                  material={material}
                  materialGroup={materialGroup}
                  deleteMaterial={material => deleteMaterial(material, materialGroup)}
                  />
              );
            })
          }
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
