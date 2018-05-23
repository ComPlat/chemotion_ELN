import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';

import ElementActions from '../actions/ElementActions';

import SampleNoComputedProps from './SampleNoComputedProps';
import SampleComputedPropsGraph from './SampleComputedPropsGraph';
import SampleComputedProps from './SampleComputedProps';

export default class SampleComputedPropsContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showGraph: false
    };

    this.computePropsFromSmiles = this.computePropsFromSmiles.bind(this);
    this.toggleGraph = this.toggleGraph.bind(this);
  }

  computePropsFromSmiles() {
    const { sample } = this.props;
    const sslabel = sample.short_label;
    const ssmiles = sample.molecule.cano_smiles;

    ElementActions.computePropsFromSmiles(sslabel, ssmiles);
  }

  toggleGraph() {
    this.setState({ showGraph: !this.state.showGraph });
  }

  render() {
    const { sample } = this.props;
    const cprop = sample.molecule_computed_prop;
    const haveCprop = (cprop && cprop.status === 'completed');

    if (!haveCprop) {
      return (
        <SampleNoComputedProps computeFunc={this.computePropsFromSmiles} />
      );
    }

    const { showGraph } = this.state;
    let text = 'Show Graph';
    let arrow = <i className="fa fa-angle-double-down" />;

    if (showGraph) {
      text = 'Hide Graph';
      arrow = <i className="fa fa-angle-double-up" />;
    }

    return (
      <div>
        <SampleComputedProps cprop={cprop} />
        <ButtonGroup vertical block>
          <Button
            bsSize="xsmall"
            style={{ backgroundColor: '#ddd' }}
            onClick={this.toggleGraph}
          >
            {text} &nbsp; {arrow}
          </Button>
        </ButtonGroup>
        <SampleComputedPropsGraph
          show={showGraph}
          graphData={[{ name: sample.short_label, props: cprop }]}
          style={{ margin: '0 auto' }}
        />
      </div>
    );
  }
}

SampleComputedPropsContainer.propTypes = {
  sample: React.PropTypes.object.isRequired,
};
