import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

import {
  Panel, ButtonToolbar, Button,
  Tabs, Tab
} from 'react-bootstrap';
import GeneralPropertiesTab from 'src/apps/mydb/elements/details/cellLines/GeneralPropertiesTab';

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
      <Panel>
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
            <Tab eventKey="tab3" title="Analyses" key="tab3">Platzhalter für Tab3</Tab>
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary">
              Save
            </Button>
            <Button bsStyle="warning">
              Close
            </Button>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
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
