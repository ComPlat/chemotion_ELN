import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import CollectionUtils from 'src/models/collection/CollectionUtils';

import {
  Tabs, Tab
} from 'react-bootstrap';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import GeneralProperties from 'src/apps/mydb/elements/details/cellLines/propertiesTab/GeneralProperties';
import AnalysesContainer from 'src/apps/mydb/elements/details/cellLines/analysesTab/AnalysesContainer';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

class CellLineDetails extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'tab1',
      readOnly: this.isReadOnly()
    };
  }

  handleSubmit(cellLineItem) {
    // eslint-disable-next-line react/destructuring-assignment
    const mobXItem = this.context.cellLineDetailsStore.cellLines(this.props.cellLineItem.id);
    cellLineItem.adoptPropsFromMobXModel(mobXItem);

    if (cellLineItem.is_new) {
      DetailActions.close(cellLineItem, true);
      ElementActions.createCellLine(cellLineItem);
    } else {
      ElementActions.updateCellLine(cellLineItem);
    }
    mobXItem.setChanged(false);
  }

  handleClose() {
    const { cellLineItem } = this.props;
    const { cellLineDetailsStore } = this.context;
    cellLineDetailsStore.removeCellLineFromStore(cellLineItem.id);
  }

  handleTabChange(eventKey) {
    this.setState({ activeTab: eventKey });
  }

  // eslint-disable-next-line class-methods-use-this
  isReadOnly() {
    const { currentCollection, isSync } = UIStore.getState();
    const { currentUser } = UserStore.getState();

    return CollectionUtils.isReadOnly(
      currentCollection,
      currentUser.id,
      isSync
    );
  }

  render() {
    const { cellLineItem } = this.props;

    if (!cellLineItem) { return (null); }
    // eslint-disable-next-line react/destructuring-assignment
    this.context.cellLineDetailsStore.convertCellLineToModel(cellLineItem);
    // ElementDetailCard expects camelCase flags for built-in behavior.
    cellLineItem.isNew = cellLineItem.is_new;

    const { cellLineDetailsStore } = this.context;
    const mobXItem = cellLineDetailsStore.cellLines(cellLineItem.id);
    const validationInfo = cellLineDetailsStore.checkInputValidity(cellLineItem.id);
    const saveDisabled = validationInfo.length > 0;
    const isPendingToSave = !!mobXItem.changed;
    const { readOnly } = this.state;
    const { activeTab } = this.state;
    return (
      <ElementDetailCard
        element={cellLineItem}
        isPendingToSave={isPendingToSave}
        title={cellLineItem.short_label}
        titleTooltip={formatTimeStampsOfElement(cellLineItem || {})}
        onClose={() => this.handleClose()}
        onSave={() => this.handleSubmit(cellLineItem)}
        saveDisabled={saveDisabled}
      >
        <div className="tabs-container--with-borders">
          <Tabs activeKey={activeTab} onSelect={(event) => this.handleTabChange(event)} id="cell-line-details-tab">
            <Tab eventKey="tab1" title="Properties" key="tab1">
              <GeneralProperties
                item={cellLineItem}
                readOnly={readOnly}
              />
            </Tab>
            <Tab eventKey="tab2" title="Analyses" key="tab2">
              <AnalysesContainer
                item={cellLineItem}
                readOnly={readOnly}
              />
            </Tab>
            <Tab eventKey="tab3" title="References" key="tab3" disabled={cellLineItem.is_new}>
              <DetailsTabLiteratures
                readOnly={readOnly}
                element={cellLineItem}
                literatures={cellLineItem.is_new ? cellLineItem.literatures : null}
              />
            </Tab>
          </Tabs>
        </div>
      </ElementDetailCard>
    );
  }
}

export default observer(CellLineDetails);

CellLineDetails.propTypes = {
  cellLineItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    itemName: PropTypes.string.isRequired,
    cellLineName: PropTypes.string.isRequired,
    short_label: PropTypes.string.isRequired,
    is_new: PropTypes.bool.isRequired,
    isNew: PropTypes.bool,
    // eslint-disable-next-line react/forbid-prop-types
    literatures: PropTypes.arrayOf(PropTypes.object),
    disease: PropTypes.string.isRequired
  }).isRequired,
};
