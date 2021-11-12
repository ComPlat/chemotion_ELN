import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import WellContainer from './WellContainer';
import WellplateLabels from './WellplateLabels';
import WellOverlay from './WellOverlay';
import WellplatesFetcher from './fetchers/WellplatesFetcher';

export default class Wellplate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showOverlay: false,
      overlayTarget: {},
      overlayWell: {},
      overlayPlacement: 'right'
    };
  }

  componentDidMount() {
    window.addEventListener('scroll', this.onScroll.bind(this));
    document.getElementsByClassName('panel-body')[0].addEventListener('scroll', this.onScroll.bind(this));
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { show } = nextProps;
    if (!show) {
      this.hideOverlay();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll.bind(this));
    document.getElementsByClassName('panel-body')[0].removeEventListener('scroll', this.onScroll.bind(this));
  }

  onScroll() {
    const { showOverlay, overlayTarget, overlayWell } = this.state;
    if (showOverlay) {
      this.hideOverlay();
      setTimeout(() => {
        this.showOverlay(overlayTarget, overlayWell);
      }, 700);
    }
  }

  swapWells(firstWell, secondWell) {
    const { handleWellsChange, wells } = this.props;
    const firstWellId = wells.indexOf(firstWell);
    const secondWellId = wells.indexOf(secondWell);
    const temp = wells[firstWellId].sample;
    wells[firstWellId].sample = wells[secondWellId].sample;
    wells[secondWellId].sample = temp;
    handleWellsChange(wells);
  }

  dropSample(droppedSample, well) {
    const { handleWellsChange, wells } = this.props;
    const wellId = wells.indexOf(well);
    const sample = droppedSample.buildChild();
    wells[wellId] = {
      ...well,
      sample
    };
    handleWellsChange(wells);
  }

  removeSampleFromWell(well) {
    const { handleWellsChange, wells } = this.props;
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
    const { cols } = this.props;
    const isWellInUpperHalf = Math.ceil(cols / 2) > key % cols;
    const placement = (isWellInUpperHalf) ? 'right' : 'left';
    this.setState({
      showOverlay: true,
      overlayTarget: key,
      overlayWell: well,
      overlayPlacement: placement
    });
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

  setWellLabel(target) {
    const { overlayWell } = this.state;
    WellplatesFetcher.updateWellLabel({
      id: overlayWell.id,
      label: target.value,
    }).then((result) => {
      overlayWell.label = result.label;
      this.setState({ overlayWell });
    });
  }

  render() {
    const {wells, size, cols, width, handleWellsChange} = this.props;
    const {showOverlay, overlayTarget, overlayWell, overlayPlacement} = this.state;
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
                hideOverlay={() => this.hideOverlay()}
                />
            </div>
          );
        })}
        <WellOverlay
          show={showOverlay}
          well={overlayWell}
          placement={overlayPlacement}
          target={() => ReactDOM.findDOMNode(this.refs[overlayTarget]).children[0]}
          handleClose={() => this.hideOverlay()}
          removeSampleFromWell={well => this.removeSampleFromWell(well)}
          handleWellLabel={value => this.setWellLabel(value)}
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
