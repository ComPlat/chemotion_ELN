import React, {Component} from 'react';
import Well from './Well';
import update from 'react/lib/update';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import Sample from './Sample';
import DragDropItemTypes from './DragDropItemTypes';

class Wellplate extends Component {
  constructor(props) {
    super(props);
    let {wells} = props;
    this.state = {
      wells
    };
    //console.log(this.state.wells);
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

  moveWell(id, afterId) {
    const {wells} = this.state;
    const {handleWellplateChange} = this.props;
    const well = wells.filter(well => well.id === id)[0];
    const afterWell = wells.filter(well => well.id === afterId)[0];
    const wellIndex = wells.indexOf(well);
    const afterIndex = wells.indexOf(afterWell);

    wells.splice(wellIndex, 1);
    wells.splice(afterIndex, 0, well);
    this.setState({
      //wells: this.calculateWellPositions(wells)
      wells
    });
    handleWellplateChange(this.state.wells);
  }

  dropSample(sampleId, wellId) {
    const {wells} = this.state;
    const {handleWellplateChange} = this.props;
    const well = wells.filter(well => well.id === wellId)[0];

    well.sampleId = sampleId;
    well.text = sampleId + '';
    this.setState({
      //wells: this.calculateWellPositions(wells)
      wells
    });
    handleWellplateChange(this.state.wells);
  }

  render() {
    let {cols, wells} = this.props;
    const style = {
      width: (50 + 5) * cols
    };
    return (
      <div>
        <div style={style}>
          {wells.map(well => {
            return (
              <Well key={well.id}
                    id={well.id}
                    moveWell={(id, afterId) => this.moveWell(id, afterId)}
                    dropSample={(sampleId, wellId) => this.dropSample(sampleId, wellId)}
                    text={well.text}
                    sampleId={well.sampleId}/>
            );
          })}
        </div>
        <br style={{clear:'left'}}/>
        <Sample id={42} name="Sample 42"/>
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Wellplate);