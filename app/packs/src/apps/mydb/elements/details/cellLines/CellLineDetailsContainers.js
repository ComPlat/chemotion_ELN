import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { PanelGroup, Panel, Button } from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import CellLineAnalysisHeader from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisHeader';

class CellLineDetailsContainers extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super();
    this.state = { openPanel: 'none' };
  }

  render() {
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(this.props.item.id);
    return (
      <div>
        <p>
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
  }

  renderContainerPanel() {
    const { currentElement } = ElementStore.getState();
    const containers = currentElement.container.children[0].children;

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

            {containers.map((container) => (
              <Panel
                eventKey={container.id}
                key={container.id}
              >
                <Panel.Heading
                  onClick={(e) => this.handleClickOnPanelHeader(container.id)}
                >
                  <CellLineAnalysisHeader element={currentElement} container={container} parent={this} />
                </Panel.Heading>
                <Panel.Body collapsible>
                  <ContainerComponent
                    templateType="researchPlan"
                    readOnly={false}
                    disabled={false}
                    container={container}
                    onChange={(container) => this.handleChange(container)}
                  />
                </Panel.Body>
              </Panel>

            ), this)}
          </PanelGroup>
        </div>
      );
    }
    return <div />;
  }

  handleChange(editedContainer) {
    this.forceUpdate();
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
}
export default observer(CellLineDetailsContainers);
