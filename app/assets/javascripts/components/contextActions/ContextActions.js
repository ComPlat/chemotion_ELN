import React from 'react';
import {ButtonGroup, OverlayTrigger, DropdownButton, Button, MenuItem} from 'react-bootstrap';
import UIStore from './../stores/UIStore';
import UIActions from './../actions/UIActions'
import CreateButton from './CreateButton';
import ReportButton from './ReportButton';
import ExportImportButton from './ExportImportButton';
import ScanCodeButton from './ScanCodeButton';

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

  isAllCollection() {
    const {currentCollection} = this.state.uiState;
    return currentCollection && currentCollection.label == 'All';
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
    const { updateModalProps } = this.props;
    return (
      <div style={{display: 'inline', float: 'left'}}>
        <ButtonGroup>
          <ExportImportButton isDisabled={this.isDisabled()}
                              updateModalProps={updateModalProps} />
          <ReportButton />
        </ButtonGroup>
        <ButtonGroup style={{marginLeft: '10px'}}>
          <CreateButton isDisabled={this.isAllCollection()}/>
        </ButtonGroup>
        <ButtonGroup style={{marginLeft: '10px'}}>
          <ScanCodeButton/>
        </ButtonGroup>
        <DeviceButtonSplit/>
      </div>
    )
  }
}

ContextActions.propTypes = {
  updateModalProps: React.PropTypes.func.isRequired,
};

const handleShowDeviceManagement = () => {
  UIActions.showDeviceManagement()
  Aviator.navigate("/device/management")
}

const DeviceButtonSplit = () => {
  return (
  <ButtonGroup style={{marginLeft: '10px'}}>
    <OverlayTrigger placement="bottom" overlay={<DeviceTooltip/>}>
      <Button 
        bsStyle="warning"
        disabled={true}
        onClick={() => {}}
      >
        UI
      </Button>
      </OverlayTrigger>
      <DropdownButton
        bsStyle="warning"
        title={<DropdownButtonTitle/>}
        style={{width: "26px", paddingLeft: "8px"}}
        id="device-selection"
      >
        <MenuItem
          onSelect={() => {}}
        >
          Device 1
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 2
        </MenuItem>
        <MenuItem
          onSelect={() => {}}
        >
          Device 3
        </MenuItem>
        <MenuItem divider />
        <MenuItem
          onSelect={() => handleShowDeviceManagement()}
        >
          Device Management
        </MenuItem>
      </DropdownButton>
    </ButtonGroup>
  )
}

const DeviceTooltip = () =>
  <Tooltip id="create_button">
    Open Device
  </Tooltip>

const DropdownButtonTitle = () =>
  <div></div>
