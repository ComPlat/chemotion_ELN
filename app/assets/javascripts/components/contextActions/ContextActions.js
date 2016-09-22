import React from 'react';
import {ButtonGroup} from 'react-bootstrap';
import UIStore from './../stores/UIStore';
import CreateButton from './CreateButton';
import ReportButton from './ReportButton';
import ExportImportButton from './ExportImportButton';

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

  isVisible() {
    const {currentCollection} = this.state.uiState

    if (currentCollection) {
      if (currentCollection.label == 'All' ||
          (currentCollection.is_shared == true && currentCollection.permission_level < 4))
      return false
    }

    return true
  }

  handleImport() {
    let title, component, action = "";
    let listSharedCollections = false
    title = "Import Elements from File";
    component = ManagingModalImport;
    action = ElementActions.importSamplesFromFile;

    this.setState({
      modalProps: {
        show: true,
        title,
        component,
        action,
        false
      }
    });
  }

  render() {
    return (
      <div style={{display: 'inline', float: 'left'}}>
        <ButtonGroup>
          <ExportImportButton isVisible={this.isVisible()} />
          <ReportButton />
        </ButtonGroup>
        <ButtonGroup style={{marginLeft: '10px'}}>
          <CreateButton isVisible={!this.isAllCollection()}/>
        </ButtonGroup>
      </div>
    )
  }
}
