import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import CellLinesFetcher from 'src/fetchers/CellLinesFetcher';

import {
  Panel, ButtonToolbar, Button,
  Tabs, Tab
} from 'react-bootstrap';
import GeneralPropertiesTab from 'src/apps/mydb/elements/details/cellLines/GeneralPropertiesTab';
import CellLineDetailsContainers from 'src/apps/mydb/elements/details/cellLines/CellLineDetailsContainers';

class CellLineDetails extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = { activeTab: 'tab1' };
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
  }

  render() {
    if (!this.props.cellLineItem) { return (null); }
    this.context.cellLineDetailsStore.convertCellLineToModel(this.props.cellLineItem);

    const item = this.props.cellLineItem;
    return (
      <Panel
        className="eln-panel-detail"
      >
        <Panel.Heading>
          {item.cellLineName}
          {' '}
          -
          {' '}
          {item.itemName}
        </Panel.Heading>
        <Panel.Body>

          <Tabs activeKey={this.state.activeTab} onSelect={(event) => this.handleTabChange(event)} id="wellplateDetailsTab">
            <Tab eventKey="tab1" title="General properties" key="tab1"><GeneralPropertiesTab item={item} /></Tab>
            <Tab eventKey="tab2" title="Analyses" key="tab2"><CellLineDetailsContainers item={item} /></Tab>
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={(e) => { this.handleClose(this.props.cellLineItem); }}>
              Close
            </Button>
            <Button bsStyle="warning" onClick={(e) => { this.handleSubmit(this.props.cellLineItem); }}>
              Save
            </Button>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }

  handleSubmit(cellLineItem) {
    const mobXItem = this.context.cellLineDetailsStore.cellLines(this.props.cellLineItem.id);
    cellLineItem.amount = mobXItem.amount;
    CellLinesFetcher.cellLineId = 5;
    // Here transformation/merging between the mobx store und elementStore
    ElementActions.updateCellLine(cellLineItem);
  }

  handleClose(cellLineItem) {
    if (confirm('Unsaved data will be lost.Close sample?')) {
      DetailActions.close(cellLineItem, true);
    }
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  handleSegmentsChange(se) {

  }

  handleTabChange(eventKey) {
    this.setState({ activeTab: eventKey });
  }
}

export default observer(CellLineDetails);
