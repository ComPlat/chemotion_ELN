/* eslint-disable no-param-reassign */

import React from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, Accordion } from 'react-bootstrap';

import ReportActions from './actions/ReportActions';
import DetailActions from './actions/DetailActions';
import UIStore from './stores/UIStore';
import ReportStore from './stores/ReportStore';

import ComputedPropsGraphContainer from './computed_props/ComputedPropsGraphContainer';

export default class GraphContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedObjTags: { sampleIds: [], reactionIds: [] },
      defaultObjTags: { sampleIds: [], reactionIds: [] },
      selectedComputedProps: []
    };

    this.onChangeUI = this.onChangeUI.bind(this);
    this.onChangeRp = this.onChangeRp.bind(this);

    this.onClose = this.onClose.bind(this);
  }

  componentDidMount() {
    ReportStore.listen(this.onChangeRp);
    UIStore.listen(this.onChangeUI);
    this.onChangeUI(UIStore.getState());
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
    ReportStore.unlisten(this.onChangeRp);
  }

  onClose() {
    DetailActions.close(this.props.graph, true);
  }

  onChangeUI(state) {
    const { selectedObjTags, defaultObjTags } = this.state;
    ReportActions.updateCheckedTags.defer({
      uiState: state,
      reportState: { selectedObjTags, defaultObjTags }
    });
  }

  onChangeRp(state) {
    const { selectedObjTags, defaultObjTags } = state;
    const selectedComputedProps = [];
    state.selectedObjs.filter(s => s.molecule_computed_props).forEach((s) => {
      const cprops = s.molecule_computed_props.sort((a, b) => (
        a.updated_at - b.updated_at
      ));
      const cprop = {
        name: s.short_label,
        svgPath: `/images/samples/${s.sample_svg_file}`,
        props: cprops[cprops.length - 1]
      };
      selectedComputedProps.push(cprop);
    });

    this.setState({
      selectedComputedProps,
      selectedObjTags,
      defaultObjTags
    });
  }

  render() {
    const { selectedComputedProps } = this.state;
    const header = (
      <div>
        {'Graph'}
        <div className="button-right">
          <Button
            key="closeBtn"
            onClick={this.onClose}
            bsStyle="danger"
            bsSize="xsmall"
            className="button-right"
          >
            <i className="fa fa-times" />
          </Button>
        </div>
      </div>
    );

    return (
      <Panel
        bsStyle="primary"
      >
        <Panel.Heading>
          {header}
        </Panel.Heading>
        <Panel.Body>
          <Accordion>
            <ComputedPropsGraphContainer
              show
              style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 303px)' }}
              graphData={selectedComputedProps}
            />
          </Accordion>
        </Panel.Body>
      </Panel>
    );
  }
}

GraphContainer.propTypes = {
  graph: PropTypes.object.isRequired
};
