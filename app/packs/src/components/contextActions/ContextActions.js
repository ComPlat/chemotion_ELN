import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, ButtonToolbar } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import CreateButton from 'src/components/contextActions/CreateButton';
import SplitElementButton from 'src/components/contextActions/SplitElementButton';
import ReportUtilButton from 'src/components/contextActions/ReportUtilButton';
import ExportImportButton from 'src/components/contextActions/ExportImportButton';
import ScanCodeButton from 'src/components/contextActions/ScanCodeButton';
import NoticeButton from 'src/components/contextActions/NoticeButton';
import InboxButton from 'src/components/contextActions/InboxButton';
import { PermissionConst } from 'src/utilities/PermissionConst';
import SampleTaskNavigationElement from 'src/components/sampleTaskInbox/SampleTaskNavigationElement';

export default class ContextActions extends React.Component {
  constructor(props) {
    super(props);
    const uiState = UIStore.getState();
    this.state = {
      uiState
    };
  }

  componentDidMount() {
    UIStore.listen((state) => this.onChange(state));
  }

  componentWillUnmount() {
    UIStore.unlisten((state) => this.onChange(state));
  }

  onChange(state) {
    const uiState = state;
    this.setState({
      uiState
    });
  }

  isCreateDisabled() {
    const { currentCollection } = this.state.uiState;
    return currentCollection && ((currentCollection.label == 'All' && currentCollection.is_locked)
      || (currentCollection.is_shared && currentCollection.is_synchronized == false) || (currentCollection.is_sync_to_me && currentCollection.permission_level < PermissionConst.Write));
  }

  isDisabled() {
    const { currentCollection } = this.state.uiState;

    if (currentCollection) {
      if ((currentCollection.label == 'All' && currentCollection.is_locked)
        || (currentCollection.is_shared == true && currentCollection.permission_level < PermissionConst.ImportElements)) { return true; }
    }

    return false;
  }

  render() {
    const { updateModalProps, customClass } = this.props;
    return (
      <div className="d-flex flex-wrap align-items-center gap-2">
        <ButtonGroup className="d-flex align-items-center">
          <SplitElementButton />
          <CreateButton isDisabled={this.isCreateDisabled()} customClass={customClass} />
        </ButtonGroup>
        <ButtonGroup className="d-flex align-items-center">
          <ExportImportButton
            isDisabled={this.isDisabled()}
            updateModalProps={updateModalProps}
            customClass={customClass}
          />
          <ReportUtilButton customClass={customClass} />
        </ButtonGroup>
        <ButtonToolbar className="d-flex flex-nowrap gap-2 align-items-center">
          <ScanCodeButton customClass={customClass} />
          <InboxButton />
          <SampleTaskNavigationElement />
          <NoticeButton />
        </ButtonToolbar>
        
      </div>
    );
  }
}

ContextActions.propTypes = {
  updateModalProps: PropTypes.func.isRequired,
  customClass: PropTypes.string,
};

ContextActions.defaultProps = {
  customClass: null,
};
