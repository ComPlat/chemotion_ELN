import React, {Component} from 'react';
import update from 'react/lib/update';
import WellContainer from './WellContainer';

export default class Wellplate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      wellContainers: this.getWellContainers(props.wells)
    };
    console.log(this.state.wellContainers);
  }

  getWellContainers(wells) {
    const {size} = this.props;
    let wellContainers = [];
    for (let i = 0; i < size; i ++) {
      const wellContainer = {id: i};
      const well = wells[i];
      if (well) {
        wellContainer.well = well;
      }
      wellContainers.push(wellContainer);
    }
    return wellContainers;
  }

  componentWillReceiveProps(nextProps) {
    const {wells} = nextProps;
    this.setState({
      wellContainers: this.getWellContainers(wells)
    });
  }

  switchWellContainers(id, afterId) {
    const {wellContainers} = this.state;
    const {handleWellplateChange} = this.props;
    const wellContainer = wellContainers.filter(container => container.id === id)[0];
    const afterWell = wellContainers.filter(container => container.id === afterId)[0];
    const wellContainerIndex = wellContainers.indexOf(wellContainer);
    const afterIndex = wellContainers.indexOf(afterWell);

    wellContainers.splice(wellContainerIndex, 1);
    wellContainers.splice(afterIndex, 0, wellContainer);
    this.setState({
      wellContainers
    });
    handleWellplateChange(this.state.wellContainers);
  }

  dropSample(sample, wellContainerId) {
    const {wellContainers} = this.state;
    const {handleWellplateChange} = this.props;
    const wellContainer = wellContainers.filter(container => container.id === wellContainerId)[0];
    // TODO request new well object in backend
    wellContainer.well = {
      id: - 1,
      position: {},
      sample
    };
    this.setState({
      wellContainers
    });
    handleWellplateChange(this.state.wellContainers);
  }

  calculateWellPositions(wells) {
    const {cols} = this.props;
    return wells.map((well, key) => {
      let remainder = (key + 1) % cols;
      return {
        ...well,
        position: {
          x: (remainder == 0) ? cols : remainder,
          y: Math.floor(key / cols) + 1
        }
      }
    });
  }

  render() {
    const {wellContainers} = this.state;
    const {size} = this.props;
    //calc cols & rows of size
    const style = {
      width: 120 * 4
    };
    const containerStyle = {
      width: 120,
      height: 120
    };
    return (
      <div style={style}>
        {wellContainers.map(container => {
          return (
            <WellContainer
              key={container.id}
              id={container.id}
              well={container.well}
              style={containerStyle}
              switchWellContainers={(id, afterId) => this.switchWellContainers(id, afterId)}
              dropSample={(sample, wellId) => this.dropSample(sample, wellId)}
              />
          );
        })}
      </div>
    );
  }
}