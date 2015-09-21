import React, {Component, PropTypes} from 'react'
import {Table} from 'react-bootstrap';
import MaterialContainer from './MaterialContainer';

export default class ReactionDetailsMaterials extends Component {
  constructor(props) {
    super(props);
    const {samples} = props;
    this.state = {
      materialContainers: this.getMaterialContainers(samples),
      materialGroup: props.materialGroup
    };
    console.log(this.state.materialContainers);
  }

  getMaterialContainers(samples) {
    let materialContainers = [];
    samples.forEach((sample, key) => {
      materialContainers.push({
        id: key,
        sample
      });
    });
    //create temp object for dropping
    materialContainers.push({
      id: materialContainers.length,
      sample: null
    });
    return materialContainers;
  }

  componentWillReceiveProps(nextProps) {
    const {samples} = nextProps;
    this.setState({
      materialContainers: this.getMaterialContainers(samples)
    });
  }

  dropSample(sample, materialContainerId) {
    const {materialContainers} = this.state;
    const {handleMaterialsChange} = this.props;
    const materialContainer = materialContainers.filter(container => container.id === materialContainerId)[0];
    if(materialContainer.sample === null) {
      //create new temp object for dropping
      materialContainers.push({
        id: materialContainers.length,
        sample: null
      });
    }  
    materialContainer.sample = sample;
    this.setState({
      materialContainers
    });
    handleMaterialsChange(this.state.materialContainers);
  }

  render() {

    const {materialContainers} = this.state;
    return (
      <table width="100%">
        <thead>
        <th width="5%">Ref</th>
        <th width="25%">Name</th>
        <th width="25%">Molecule</th>
        <th width="25%">Amount</th>
        <th width="20%">Equi</th>
        </thead>
        <tbody>
        {materialContainers.map((container, key) => {
          return <MaterialContainer
            material={container}
            key={key}
            dropSample={(sample, materialId) => this.dropSample(sample, materialId)}
            />
        })}
        </tbody>
      </table>
    )
  }
}


ReactionDetailsMaterials.propTypes = {
  samples: PropTypes.array.isRequired
};

