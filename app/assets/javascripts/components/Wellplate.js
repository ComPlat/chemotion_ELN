import React, {PropTypes, Component} from 'react';
import WellContainer from './WellContainer';
import WellplateLabels from './WellplateLabels';
import WellOverlay from './WellOverlay';

import Sample from './models/Sample';

export default class Wellplate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showOverlay: false,
      overlayTarget: {},
      overlayWell: {}
    }
  }

  swapWells(firstWell, secondWell) {
    const {handleWellsChange, wells} = this.props;
    const firstWellId = wells.indexOf(firstWell);
    const secondWellId = wells.indexOf(secondWell);
    let temp = wells[firstWellId].sample;
    wells[firstWellId].sample = wells[secondWellId].sample;
    wells[secondWellId].sample = temp;
    handleWellsChange(wells);
  }

  dropSample(droppedSample, well) {
    const {handleWellsChange, wells} = this.props;
    const wellId = wells.indexOf(well);
    const sample = Sample.buildChild(droppedSample);
    wells[wellId] = {
      ...well,
      sample
    };
    handleWellsChange(wells);
  }

  removeSampleFromWell(well) {
    const {handleWellsChange, wells} = this.props;
    const wellId = wells.indexOf(well);
    wells[wellId] = {
      ...well,
      sample: null
    };
    handleWellsChange(wells);
    this.hideOverlay();
  }

  hideOverlay() {
    this.setState({
      showOverlay: false
    });
  }

  showOverlay(key, well) {
    //if (well.sample) {
      this.setState({
        showOverlay: true,
        overlayTarget: key,
        overlayWell: well
      });
    //}
  }

  toggleOverlay(key, well) {
    const {showOverlay, overlayWell} = this.state;
    if (showOverlay && overlayWell == well) {
      this.hideOverlay();
    } else {
      this.showOverlay(key, well);
    }
  }

  isWellActive(well) {
    const {showOverlay, overlayWell} = this.state;
    return (showOverlay && overlayWell == well);
  }

  render() {
    const {wells, size, cols, width} = this.props;
    const {showOverlay, overlayTarget, overlayWell} = this.state;
    const style = {
      width: (cols + 1) * width,
      height: ((size / cols) + 1) * width
    };
    const containerStyle = {
      width: width,
      height: width,
      fontSize: 8
    };
    return (
      <div style={style}>
        <WellplateLabels
          size={size}
          cols={cols}
          width={width}
          type={'horizontal'}
          />
        <WellplateLabels
          size={size}
          cols={cols}
          width={width}
          type={'vertical'}
          />
        {wells.map((well, key) => {
          //
          return (
            <div
              key={key}
              ref={key}
              onClick={event => this.toggleOverlay(key, well)}
              >
              <WellContainer
                well={well}
                style={containerStyle}
                swapWells={(firstWell, secondWell) => this.swapWells(firstWell, secondWell)}
                dropSample={(sample, wellId) => this.dropSample(sample, wellId)}
                active={this.isWellActive(well)}
                />
            </div>
          );
        })}
        <WellOverlay
          show={showOverlay}
          well={overlayWell}
          target={() => React.findDOMNode(this.refs[overlayTarget]).children[0]}
          handleClose={() => this.hideOverlay()}
          removeSampleFromWell={well => this.removeSampleFromWell(well)}
          />
      </div>
    );
  }
}

Wellplate.propTypes = {
  size: PropTypes.number.isRequired,
  wells: PropTypes.array.isRequired,
  handleWellsChange: PropTypes.func.isRequired
};
