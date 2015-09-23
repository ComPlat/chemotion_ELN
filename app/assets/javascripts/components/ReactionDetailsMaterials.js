import React, {Component, PropTypes} from 'react'
import {Table} from 'react-bootstrap';
import MaterialContainer from './MaterialContainer';

export default class ReactionDetailsMaterials extends Component {
  dropSample(sample) {
    const {materials, materialGroup, handleMaterialsChange} = this.props;
    materials.push(sample);
    handleMaterialsChange(materials, materialGroup);
  }

  deleteMaterial(material) {
    const {materials, handleMaterialsChange, materialGroup} = this.props;
    const materialIndex = materials.indexOf(material);
    materials.splice(materialIndex, 1);
    handleMaterialsChange(materials, materialGroup);
  }

  dropMaterial(material, previousMaterialGroup) {
    const {materials, materialGroup, handleMaterialsChange, removeMaterialFromMaterialGroup} = this.props;
    //remove from previous materialGroup
    removeMaterialFromMaterialGroup(material, previousMaterialGroup);
    //add to new materialGroup
    materials.push(material);
    handleMaterialsChange(materials, materialGroup);
  }

  render() {
    const {materials, materialGroup} = this.props;
    return (
      <table width="100%">
        <thead>
        <th width="5%">Ref</th>
        <th width="20%">Name</th>
        <th width="20%">Molecule</th>
        <th width="30%">Amount</th>
        <th width="20%">Equi</th>
        <th width="5%"></th>
        </thead>
        <tbody>
        {
          materials.map((material, key) => {
            return <MaterialContainer
              material={material}
              materialGroup={materialGroup}
              key={key}
              dropMaterial={(material, materialGroup) => this.dropMaterial(material, materialGroup)}
              deleteMaterial={material => this.deleteMaterial(material)}
              />
          })
        }

        <MaterialContainer
          material={{}}
          materialGroup={materialGroup}
          dropMaterial={(material, materialGroup) => this.dropMaterial(material, materialGroup)}
          dropSample={(material, materialId) => this.dropSample(material, materialId)}
          />
        </tbody>
      </table>
    )
  }
}

ReactionDetailsMaterials.propTypes = {
  materials: PropTypes.array.isRequired,
  handleMaterialsChange: PropTypes.func.isRequired
};

