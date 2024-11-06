import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import ElementActions from 'src/stores/alt/actions/ElementActions';

import ComputedPropsGraphContainer from 'src/components/computedProps/ComputedPropsGraphContainer';
import SampleComputedProps from 'src/components/computedProps/SampleComputedProps';
import ConfirmModal from 'src/components/common/ConfirmModal';

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
    let arrow = <i className="fa fa-angle-double-down ms-2" />;

    if (showGraph) {
      text = 'Hide Graph';
      arrow = <i className="fa fa-angle-double-up ms-2" />;
    }
    const confirmText = (
      <h5>Would you like to simulate this molecule ?</h5>
    );

    return (
      <>
        <div className="d-flex align-items-center">
          <SampleComputedProps cprops={cprops} />
          <Button
            variant="success"
            size="sm"
            onClick={this.onClickComputeBtn}
            className="my-2 ms-auto"
          >
            <i className="fa fa-paper-plane me-1" />
            Compute
          </Button>
        </div>
        <Button
          size="sm"
          className="w-100 bg-gray-300 p-0 text-gray-600 mt-3"
          onClick={this.toggleGraph}
        >
          {text}
          {arrow}
        </Button>
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
      </>
    );
  }
}

ComputedPropsContainer.propTypes = {
  sample: PropTypes.object.isRequired,
};
