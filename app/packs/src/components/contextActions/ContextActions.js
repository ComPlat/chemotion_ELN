import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import CreateButton from 'src/components/contextActions/CreateButton';
import ReportUtilButton from 'src/components/contextActions/ReportUtilButton';
import ExportImportButton from 'src/components/contextActions/ExportImportButton';
import ScanCodeButton from 'src/components/contextActions/ScanCodeButton';
import NoticeButton from 'src/components/contextActions/NoticeButton';
import InboxButton from 'src/components/contextActions/InboxButton';
import { PermissionConst } from 'src/utilities/PermissionConst';

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
      || (currentCollection.is_shared && currentCollection.is_synchronized == false) || (currentCollection.is_sync_to_me && currentCollection.permission_level != PermissionConst.Write));
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
      <div style={{ display: 'inline', float: 'left' }}>
        <ButtonGroup>
          <ExportImportButton
            isDisabled={this.isDisabled()}
            updateModalProps={updateModalProps}
            customClass={customClass}
          />
          <ReportUtilButton customClass={customClass} />
        </ButtonGroup>
        <ButtonGroup style={{ marginLeft: '10px' }}>
          <CreateButton isDisabled={this.isCreateDisabled()} customClass={customClass} />
        </ButtonGroup>
        <ButtonGroup style={{ marginLeft: '10px' }}>
          <ScanCodeButton customClass={customClass} />
        </ButtonGroup>
        <ButtonGroup style={{ marginLeft: '10px' }}>
          <InboxButton />
        </ButtonGroup>
        <ButtonGroup style={{ marginLeft: '10px' }}>
          <NoticeButton />
        </ButtonGroup>
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
