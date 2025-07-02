import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ReportStore from 'src/stores/alt/stores/ReportStore';

import ComputedPropsGraphContainer from 'src/components/computedProps/ComputedPropsGraphContainer';

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
    const { graph } = this.props;
    DetailActions.close(graph, true);
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
    state.selectedObjs.filter((s) => s.molecule_computed_props).forEach((s) => {
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

    return (
      <DetailCard
        header={(
          <div className="d-flex align-items-baseline justify-content-between">
            <div>
              <i className="fa fa-area-chart me-1" />
              Graph
            </div>
            <Button
              key="closeBtn"
              onClick={this.onClose}
              variant="danger"
              size="xxsm"
            >
              <i className="fa fa-times" />
            </Button>
          </div>
        )}
      >
        <ComputedPropsGraphContainer
          show
          style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 303px)' }}
          graphData={selectedComputedProps}
        />
      </DetailCard>
    );
  }
}

GraphContainer.propTypes = {
  graph: PropTypes.object.isRequired
};
