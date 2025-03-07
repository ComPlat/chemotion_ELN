import React from 'react';
import { FlowViewerModal as GenericUiFlowViewerModal } from 'chem-generic-ui';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

export default class FlowViewerModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showGenericWorkflow: false,
      propGenericWorkflow: {},
    };

    this.handleUiStoreChange = this.handleUiStoreChange.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.handleUiStoreChange);
    this.handleUiStoreChange(UIStore.getState());
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUiStoreChange);
  }

  handleUiStoreChange(state) {
    if (this.state.showGenericWorkflow !== state.showGenericWorkflow ||
      this.state.propGenericWorkflow !== state.propGenericWorkflow) {
      this.setState({
        showGenericWorkflow: state.showGenericWorkflow,
        propGenericWorkflow: state.propGenericWorkflow
      });
    }
  }

  render() {
    const { showGenericWorkflow, propGenericWorkflow } = this.state;

    return (
      <GenericUiFlowViewerModal
        show={showGenericWorkflow || false}
        data={propGenericWorkflow || {}}
        fnHide={() => UIActions.showGenericWorkflowModal(false)}
      />
    );
  }
}
