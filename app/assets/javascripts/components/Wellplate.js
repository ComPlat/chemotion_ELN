import React, {Component} from 'react';
import WellContainer from './WellContainer';
import update from 'react/lib/update';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import Sample from './Sample';
import DragDropItemTypes from './DragDropItemTypes';

class Wellplate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      wellContainers: this.getWellContainers()
    };
    console.log(this.state.wellContainers);
  }

  getWellContainers() {
    const {wells, size} = this.props;
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

    wellContainer.well = {
      id: -1,
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
      width: (50 + 5) * 4
    };
    return (
      <div>
        <div style={style}>
          {wellContainers.map(container => {
            return (
              <WellContainer
                key={container.id}
                id={container.id}
                well={container.well}
                switchWellContainers={(id, afterId) => this.switchWellContainers(id, afterId)}
                dropSample={(sampleId, wellId) => this.dropSample(sampleId, wellId)}
                />
            );
          })}
        </div>
        <br style={{clear:'left'}}/>
        <br/>
        <Sample id={42} name="Sample 42"/>
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Wellplate);