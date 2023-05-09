import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { PanelGroup, Panel, Button } from 'react-bootstrap';
import Container from 'src/models/Container';
import ContainerComponent from 'src/components/container/ContainerComponent';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import QuillViewer from 'src/components/QuillViewer';

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

        {this.context.cellLineDetailsStore.analysisAmount(this.props.item.id)}
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
    const amount = this.context.cellLineDetailsStore.analysisAmount(this.props.item.id);
    const { currentElement } = ElementStore.getState();
    const containers = currentElement.container.children[0].children;

    if (amount > 0) {
      return (

        <div>
          <PanelGroup
            defaultActiveKey="none"
            activeKey={this.state.openPanel}
            accordion
          >

            {containers.map((container) => (
              <Panel
                eventKey={container.id}
                key={container.id}
              >
                <Panel.Heading
                  onClick={(e) => this.handleClickOnPanelHeader(container.id)}
                >
                  {this.renderAnalysisHeader(container)}
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
    console.log('Hallo');
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
    const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
    const contentOneLine = {
      ops: content.ops.map((x) => {
        const c = { ...x };
        if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
        return c;
      }),
    };

    if (container.is_deleted) {

    } else {
      return (
        <div className="lower-text">
          <div className="main-title">{container.name}</div>
          <div className="sub-title">
            Type:
            {container.type || ''}
          </div>
          <div className="sub-title">
            Status:
            {container.status || ''}
          </div>
          <div className="desc sub-title">
            <span style={{ float: 'left', marginRight: '5px' }}>
              Content:
            </span>
            <QuillViewer value={contentOneLine} preview />
          </div>

        </div>
      );
    }
  }
}
export default observer(CellLineDetailsContainers);
