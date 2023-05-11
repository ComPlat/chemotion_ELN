import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { PanelGroup, Panel, Button } from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import CellLineAnalysisOrderRow from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisOrderRow';
import CellLineAnalysisEditRow from 'src/apps/mydb/elements/details/cellLines/CellLineDetailsEditRow';


class CellLineDetailsContainers extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super();
    this.state = { openPanel: 'none',mode:'edit'};
  }

  render() {
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(this.props.item.id);
    return (
      <div>
        <p>
          {this.renderOrderModeButton()}
          {this.addButton()}
        </p>
        { this.renderContainerPanel()}

      </div>
    );
  }

  handleAdd() {
    const newContainer = this.context.cellLineDetailsStore.addEmptyContainer(this.props.item.id);
    const { currentElement } = ElementStore.getState();
    currentElement.container.children[0].children.push(newContainer);
    this.forceUpdate();
  }

  renderContainerPanel() {
    const { currentElement } = ElementStore.getState();
    const containers = currentElement.container.children[0].children;
    const analysisRows=this.state.mode==='edit'?
      containers.map((container) => (<CellLineAnalysisEditRow parent = {this} element={currentElement} container={container}/>), this):
      containers.map((container) => (<CellLineAnalysisOrderRow container={container}/>), this);

    if (containers.length > 0) {
      return (
        <div>
          <PanelGroup
            id={`cellLineAnalysisPanelGroupOf:${currentElement.id}`}
            defaultActiveKey="none"
            activeKey={this.state.openPanel}
            accordion
            onSelect={(e) => {}}
          >
            {analysisRows}
          </PanelGroup>
        </div>
      );
    }
    return <div />;
  }

  handleModeToggle(){
    if(this.state.mode==='edit'){
      this.setState({ mode: 'order' });
    }else{
      this.setState({ mode: 'edit' });
    }
  }

  handleChange(editedContainer) {
    this.forceUpdate();
  }

  renderOrderModeButton(){
    return (
      <Button  bsSize="xsmall" bsStyle="success" onClick={() => this.handleModeToggle()}>
        mode
      </Button>
    );
  }

  addButton() {
    return (
      <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
        Add analysis
      </Button>
    );
  }

  handleClickOnPanelHeader(containerId) {
    if (this.state.openPanel == containerId) {
      this.setState({ openPanel: 'none' });
    } else {
      this.setState({ openPanel: containerId });
    }
  }

  renderAnalysisHeader(container) {

  }
  toggleMode() {
    const { mode } = this.state;
    if (mode === 'edit') {
      this.setState({ mode: 'order' });
    } else {
      this.setState({ mode: 'edit' });
    }
  }
}
export default observer(CellLineDetailsContainers);
