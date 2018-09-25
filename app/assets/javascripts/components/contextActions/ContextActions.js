import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup } from 'react-bootstrap';
import UIStore from './../stores/UIStore';
import CreateButton from './CreateButton';
import ReportUtilButton from './ReportUtilButton';
import ExportImportButton from './ExportImportButton';
import ScanCodeButton from './ScanCodeButton';
import NoticeButton from './NoticeButton';
//import DeviceButton from './DeviceButton'

export default class ContextActions extends React.Component {
  constructor(props) {
    super(props);
    const uiState = UIStore.getState();
    this.state = {
      uiState
    }
  }

  componentDidMount() {
    UIStore.listen(state => this.onChange(state));
  }

  componentWillUnmount() {
    UIStore.unlisten(state => this.onChange(state));
  }

  onChange(state) {
    const uiState = state;
    this.setState({
      uiState
    });
  }

  isCreateDisabled() {
    const {currentCollection} = this.state.uiState;
    return currentCollection && (currentCollection.label == 'All' ||
                             currentCollection.is_shared);
  }

  isDisabled() {
    const {currentCollection} = this.state.uiState

    if (currentCollection) {
      if (currentCollection.label == 'All' ||
          (currentCollection.is_shared == true && currentCollection.permission_level < 4))
      return true
    }

    return false
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
          <NoticeButton />
        </ButtonGroup>
      </div>
    )
  }
}

ContextActions.propTypes = {
  updateModalProps: PropTypes.func.isRequired,
  customClass: PropTypes.string,
};

ContextActions.defaultProps = {
  customClass: null,
};
