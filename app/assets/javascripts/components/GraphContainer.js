/* eslint-disable no-param-reassign */

import React, { PropTypes } from 'react';
import _ from 'lodash';
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
    const newTags = {
      sampleIds: state.sample.checkedIds.toArray(),
      reactionIds: state.reaction.checkedIds.toArray()
    };

    const oldTags = this.state.selectedObjTags;
    if (_.isEqual(newTags, oldTags) === false) {
      const defaultTags = this.state.defaultObjTags;
      ReportActions.updateCheckedTags.defer(oldTags, newTags, defaultTags);
    }
  }

  onChangeRp(state) {
    const selectedComputedProps = state.selectedObjs.map(s => (
      { name: s.short_label, props: s.molecule_computed_prop }
    ));

    this.setState({
      selectedComputedProps,
      selectedObjTags: state.selectedObjTags,
      defaultObjTags: state.defaultObjTags
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
        header={header}
      >
        <Accordion>
          <ComputedPropsGraphContainer
            show
            style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 303px)' }}
            graphData={selectedComputedProps}
          />
        </Accordion>
      </Panel>
    );
  }
}

GraphContainer.propTypes = {
  graph: PropTypes.object.isRequired
};
