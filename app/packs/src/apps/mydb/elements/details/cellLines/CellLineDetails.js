import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import PropTypes from 'prop-types';

import {
  Panel, ButtonToolbar, Button,
  Tabs, Tab
} from 'react-bootstrap';
import GeneralProperties from 'src/apps/mydb/elements/details/cellLines/GeneralProperties';
import AnalysesContainer from 'src/apps/mydb/elements/details/cellLines/analysesTab/AnalysesContainer';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';

class CellLineDetails extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = { activeTab: 'tab1' };
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
  }

  handleSubmit(cellLineItem) {
    // eslint-disable-next-line react/destructuring-assignment
    const mobXItem = this.context.cellLineDetailsStore.cellLines(this.props.cellLineItem.id);
    cellLineItem.adoptPropsFromMobXModel(mobXItem);
    
    
    
    if(cellLineItem.is_new){
      DetailActions.close(cellLineItem, true);
      ElementActions.updateCellLine(cellLineItem);
    }else{
      ElementActions.updateCellLine(cellLineItem);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  handleClose(cellLineItem) {
    // eslint-disable-next-line no-alert
    if (window.confirm('Unsaved data will be lost.Close sample?')) {
      DetailActions.close(cellLineItem, true);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  handleLiteratureChange() {

  }

  // eslint-disable-next-line class-methods-use-this
  handleSegmentsChange() {

  }

  handleTabChange(eventKey) {
    this.setState({ activeTab: eventKey });
  }

  onTabPositionChanged(visible) {
    // eslint-disable-next-line react/no-unused-state
    this.setState({ visible });
  }

  renderHeaderContent(){
    const { cellLineItem } = this.props;
    const content='new Cell Line';
    if(cellLineItem.cellLineName && cellLineItem.itemName){
      const content= cellLineItem.cellLineName+' - '+cellLineItem.itemName
    }
return (
  <div>
  {content}
  </div>
    );
  }

  render() {
    const { cellLineItem } = this.props;
    if (!cellLineItem) { return (null); }
    // eslint-disable-next-line react/destructuring-assignment
    this.context.cellLineDetailsStore.convertCellLineToModel(cellLineItem);

    const { activeTab } = this.state;
    return (
      <Panel
        className="eln-panel-detail"
      >
        <Panel.Heading>{this.renderHeaderContent()}</Panel.Heading>
        <Panel.Body>

          <Tabs activeKey={activeTab} onSelect={(event) => this.handleTabChange(event)} id="wellplateDetailsTab">
            <Tab eventKey="tab1" title="General properties" key="tab1"><GeneralProperties item={cellLineItem} /></Tab>
            <Tab eventKey="tab2" title="Analyses" key="tab2"><AnalysesContainer item={cellLineItem} /></Tab>
            <Tab eventKey="tab3" title="References" key="tab3">
              <DetailsTabLiteratures
                element={cellLineItem}
                literatures={cellLineItem.isNew === true ? cellLineItem.literatures : null}
                onElementChange={(r) => this.handleLiteratureChange(r)}
              />
            </Tab>
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => { this.handleClose(cellLineItem); }}>
              Close
            </Button>
            <Button bsStyle="warning" onClick={() => { this.handleSubmit(cellLineItem); }}>
              Save
            </Button>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}



export default observer(CellLineDetails);

CellLineDetails.propTypes = {
  cellLineItem: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    itemName: PropTypes.string.isRequired,
    cellLineName: PropTypes.string.isRequired,
    isNew: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    literatures: PropTypes.arrayOf(PropTypes.object).isRequired,
    disease: PropTypes.string.isRequired
  })).isRequired
};
