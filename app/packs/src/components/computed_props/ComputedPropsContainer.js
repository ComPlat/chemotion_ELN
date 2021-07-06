import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, Button, ControlLabel } from 'react-bootstrap';

import ElementActions from '../actions/ElementActions';

import ComputedPropsGraphContainer from './ComputedPropsGraphContainer';
import SampleComputedProps from './SampleComputedProps';
import { ConfirmModal } from '../common/ConfirmModal';

export default class ComputedPropsContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showGraph: false,
      compute: false
    };

    this.onClickComputeBtn = this.onClickComputeBtn.bind(this);
    this.computePropsFromSmiles = this.computePropsFromSmiles.bind(this);
    this.toggleGraph = this.toggleGraph.bind(this);
  }

  onClickComputeBtn() {
    this.setState({ compute: true });
  }

  computePropsFromSmiles(shouldPerform) {
    if (shouldPerform) {
      const { sample } = this.props;
      ElementActions.computePropsFromSmiles(sample.id);
    }

    this.setState({ compute: false });
  }

  toggleGraph() {
    this.setState({ showGraph: !this.state.showGraph });
  }

  render() {
    const { sample } = this.props;
    const cprops = sample.molecule_computed_props || [];
    let lastCProp = null;

    if (cprops && cprops.length > 0) {
      cprops.sort((a, b) => a.updated_at - b.updated_at);
      lastCProp = cprops[cprops.length - 1];
    }

    const { compute, showGraph } = this.state;
    let text = 'Show Graph';
    let arrow = <i className="fa fa-angle-double-down" />;

    if (showGraph) {
      text = 'Hide Graph';
      arrow = <i className="fa fa-angle-double-up" />;
    }
    const confirmText = (
      <ControlLabel>Would you like to simulate this molecule ?</ControlLabel>
    );

    return (
      <div>
        <SampleComputedProps cprops={cprops} />
        <Button
          bsStyle="success"
          bsSize="small"
          className="button-right"
          onClick={this.onClickComputeBtn}
          style={{ marginTop: '10px', marginBottom: '10px' }}
        >
          <i className="fa fa-paper-plane" />
          &nbsp;&nbsp; Compute
        </Button>
        <ButtonGroup vertical block>
          <Button
            bsSize="xsmall"
            style={{ marginBottom: '20px', backgroundColor: '#ddd' }}
            onClick={this.toggleGraph}
          >
            {text} &nbsp; {arrow}
          </Button>
        </ButtonGroup>
        <ComputedPropsGraphContainer
          show={showGraph}
          graphData={[{ name: sample.short_label, props: lastCProp }]}
        />
        <ConfirmModal
          showModal={compute}
          title="Are you sure ?"
          content={confirmText}
          onClick={this.computePropsFromSmiles}
        />
      </div>
    );
  }
}

ComputedPropsContainer.propTypes = {
  sample: PropTypes.object.isRequired,
};
