import React, { Component } from 'react';
import html2pdf from 'html2pdf.js/src';
import PropTypes from 'prop-types';
import {
  Card, ListGroup, ListGroupItem, Tabs, Tab
} from 'react-bootstrap';
import { findIndex } from 'lodash';
import Immutable from 'immutable';
import { StoreContext } from 'src/stores/mobx/RootStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import Wellplate from 'src/apps/mydb/elements/details/wellplates/designerTab/Wellplate';
import WellplateList from 'src/apps/mydb/elements/details/wellplates/listTab/WellplateList';
import WellplateProperties from 'src/apps/mydb/elements/details/wellplates/propertiesTab/WellplateProperties';
import WellplateDetailsContainers from
  'src/apps/mydb/elements/details/wellplates/analysesTab/WellplateDetailsContainers';
// eslint-disable-next-line import/no-named-as-default
import WellplateDetailsAttachments from
  'src/apps/mydb/elements/details/wellplates/attachmentsTab/WellplateDetailsAttachments';
import Attachment from 'src/models/Attachment';
import Utils from 'src/utilities/Functions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import DetailCardButton from 'src/apps/mydb/elements/details/DetailCardButton';
import ExportSamplesButton from 'src/apps/mydb/elements/details/ExportSamplesButton';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import WellplateModel from 'src/models/Wellplate';
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import { EditUserLabels } from 'src/components/UserLabels';

export default class WellplateDetails extends Component {
  /* eslint-disable react/destructuring-assignment */
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const { wellplate } = props;
    this.state = {
      wellplate,
      activeTab: UIStore.getState().wellplate.activeTab,
      showWellplate: true,
      visible: Immutable.List(),
      currentUser: (UserStore.getState() && UserStore.getState().currentUser) || {},
    };
    this.handleWellplateChanged = this.handleWellplateChanged.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
  }

  componentDidMount() {
    const { wellplate } = this.props;
    const { currentUser } = this.state;

    UIStore.listen(this.onUIStoreChange);

    if (MatrixCheck(currentUser.matrix, commentActivation) && !wellplate.isNew) {
      CommentActions.fetchComments(wellplate);
    }
  }

  componentDidUpdate() {
    const { wellplate: newWellplate } = this.props;
    const { wellplate: currentWellplate } = this.state;
    if (newWellplate.id !== currentWellplate.id || newWellplate.updated_at !== currentWellplate.updated_at) {
      this.setState({
        wellplate: newWellplate,
      });
    }
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  handleSegmentsChange(se) {
    const { wellplate } = this.state;
    const { segments } = wellplate;
    const idx = findIndex(segments, (o) => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    wellplate.segments = segments;
    wellplate.changed = true;
    this.setState({ wellplate });
  }

  handleSubmit() {
    const { wellplate } = this.state;
    this.context.attachmentNotificationStore.clearMessages();
    LoadingActions.start();
    if (wellplate.isNew) {
      ElementActions.createWellplate(wellplate);
    } else {
      ElementActions.updateWellplate(wellplate);
    }
    if (wellplate.is_new) {
      const force = true;
      DetailActions.close(wellplate, force);
    }
    wellplate.updateChecksum();
  }

  handleWellplateChanged(el) {
    const wellplate = el;
    wellplate.changed = true;
    this.setState({ wellplate });
  }

  handlePrint() {
    const element = document.getElementById('wellplate-designer');
    if (element) {
      const opt = { filename: `${this.state.wellplate.name}-wells.pdf` };
      html2pdf(element, opt);
    }
  }

  handleWellsChange(wells) {
    const { wellplate } = this.state;
    wellplate.wells = wells;
    this.setState({ wellplate });
  }

  handleAddReadout() {
    const { wellplate } = this.state;
    wellplate.wells.forEach((well) => {
      well.readouts.push({ value: '', unit: '' });
    });
    this.setState({ wellplate });
  }

  handleRemoveReadout(index) {
    const { wellplate } = this.state;
    wellplate.wells.forEach((well) => {
      well.readouts.splice(index, 1);
    });
    this.setState({ wellplate });
  }

  handleChangeProperties(change = {}) {
    const { wellplate } = this.state;
    const { type, value } = change;

    if (type == 'name') wellplate.name = value === '' ? 'New Wellplate' : value;
    if (type == 'description') wellplate.description = value;
    if (type == 'readoutTitles') wellplate.readout_titles = value;
    if (type == 'size') wellplate.changeSize(value.width, value.height);

    this.setState({ wellplate });
  }

  handleTabChange(eventKey) {
    const showWellplate = (eventKey === 0);
    this.setState((previousState) => ({ ...previousState, activeTab: eventKey, showWellplate }));
    UIActions.selectTab({ tabKey: eventKey, type: 'wellplate' });
  }

  // handle attachment actions
  handleAttachmentDrop(files) {
    this.setState((prevState) => {
      const newAttachments = files.map((file) => Attachment.fromFile(file));
      const { wellplate } = prevState;

      wellplate.attachments = [
        ...wellplate.attachments || [],
        ...newAttachments
      ];

      wellplate.changed = true;

      return { wellplate };
    });
  }

  handleAttachmentDelete(attachment) {
    const { wellplate } = this.state;
    const index = wellplate.attachments.indexOf(attachment);
    wellplate.changed = true;
    wellplate.attachments[index].is_deleted = true;
    this.setState({ wellplate });
  }

  handleAttachmentImport(attachment) {
    LoadingActions.start();
    const { wellplate } = this.state;
    const wellplateId = wellplate.id;
    const attachmentId = attachment.id;

    ElementActions.importWellplateSpreadsheet(wellplateId, attachmentId);
  }

  handleAttachmentUndoDelete(attachment) {
    const { wellplate } = this.state;
    const index = wellplate.attachments.indexOf(attachment);
    wellplate.attachments[index].is_deleted = false;
    this.setState({ wellplate });
  }

  handleAttachmentDownload(attachment) { // eslint-disable-line class-methods-use-this
    Utils.downloadFile({ contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename });
  }

  handleAttachmentEdit(attachment) {
    const { wellplate } = this.state;
    wellplate.changed = true;
    // update only this attachment
    wellplate.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) {
        return attachment;
      }
      return currentAttachment;
    });
    this.setState({ wellplate });
    this.forceUpdate();
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  onUIStoreChange(state) {
    if (state.wellplate.activeTab !== this.state.activeTab) {
      this.setState({
        activeTab: state.wellplate.activeTab
      });
    }
  }

  wellplateFooter() {
    const { wellplate } = this.state;
    return (
      <>
        {wellplate && !wellplate.isNew && (
          <ExportSamplesButton type="wellplate" id={wellplate.id} />
        )}
        <DetailCardButton
          label="Print Wells"
          iconClass="fa fa-print"
          header={false}
          onClick={() => this.handlePrint()}
          disabled={wellplate.width > 12}
        />
      </>
    );
  }

  render() {
    const { wellplate, showWellplate, visible } = this.state;
    const readoutTitles = wellplate.readout_titles;
    const tabContentsMap = {
      designer: (
        <Tab eventKey="designer" title="Designer" key={`designer_${wellplate.id}`}>
          {
            !wellplate.isNew && <CommentSection section="wellplate_designer" element={wellplate} />
          }
          <Card id="wellplate-designer" className="overflow-scroll">
            <Card.Body>
              <Wellplate
                wellplate={wellplate}
                handleWellsChange={(wells) => this.handleWellsChange(wells)}
              />
            </Card.Body>
          </Card>
        </Tab>
      ),
      list: (
        <Tab eventKey="list" title="List" key={`list_${wellplate.id}`}>
          {
            !wellplate.isNew && <CommentSection section="wellplate_list" element={wellplate} />
          }
          <div className="mb-4">
            <WellplateList
              wells={wellplate.wells}
              readoutTitles={readoutTitles}
              handleWellsChange={(w) => this.handleWellsChange(w)}
            />
          </div>
        </Tab>
      ),
      properties: (
        <Tab eventKey="properties" title="Properties" key={`properties_${wellplate.id}`}>
          {
            !wellplate.isNew && <CommentSection section="wellplate_properties" element={wellplate} />
          }
          <WellplateProperties
            readoutTitles={readoutTitles}
            wellplate={wellplate}
            changeProperties={(c) => this.handleChangeProperties(c)}
            handleAddReadout={(c) => this.handleAddReadout(c)}
            handleRemoveReadout={(c) => this.handleRemoveReadout(c)}
          />
          <EditUserLabels
            element={wellplate}
            fnCb={this.handleWellplateChanged}
          />
          <PrivateNoteElement element={wellplate} disabled={wellplate.can_update || false} />
          {' '}
          {/* For samples and reactions (<element>): disabled={!<element>.can_update} */}
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${wellplate.id}`}>
          {
            !wellplate.isNew && <CommentSection section="wellplate_analyses" element={wellplate} />
          }
          <ListGroupItem className="pb-2">
            <WellplateDetailsContainers
              wellplate={wellplate}
              setWellplate={(w) => this.setState({ wellplate: w })}
              handleWellplateChanged={this.handleWellplateChanged}
            />
          </ListGroupItem>
        </Tab>
      ),
      attachments: (
        <Tab eventKey="attachments" title="Attachments" key={`attachments_${wellplate.id}`}>
          <ListGroup fill="true">
            <ListGroupItem>
              <WellplateDetailsAttachments
                wellplate={wellplate}
                attachments={wellplate.attachments}
                onDrop={this.handleAttachmentDrop.bind(this)}
                onDelete={this.handleAttachmentDelete.bind(this)}
                onUndoDelete={this.handleAttachmentUndoDelete.bind(this)}
                onDownload={this.handleAttachmentDownload.bind(this)}
                onImport={this.handleAttachmentImport.bind(this)}
                onEdit={this.handleAttachmentEdit.bind(this)}
                readOnly={false}
              />
            </ListGroupItem>
          </ListGroup>
        </Tab>
      ),
      history: (
        <Tab
          eventKey="history"
          title="History"
          key={`Versions_Wellplate_${wellplate.id.toString()}`}
        >
          <VersionsTable
            type="wellplates"
            id={wellplate.id}
            element={wellplate}
            parent={this}
            isEdited={wellplate.isEdited}
          />
        </Tab>
      ),
    };

    addSegmentTabs(wellplate, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });

    // eslint-disable-next-line react/destructuring-assignment
    const activeTab = (this.state.activeTab !== 0 && this.state.activeTab) || visible[0];

    return (
      <ElementDetailCard
        element={wellplate}
        isPendingToSave={wellplate.isPendingToSave}
        title={wellplate.name}
        titleTooltip={formatTimeStampsOfElement(wellplate || {})}
        footerToolbar={this.wellplateFooter()}
        onSave={() => this.handleSubmit()}
        showPrintCode
      >
        <div className="tabs-container--with-borders">
          <ElementDetailSortTab
            type="wellplate"
            availableTabs={Object.keys(tabContentsMap)}
            onTabPositionChanged={this.onTabPositionChanged}
            openedFromCollectionId={this.props.openedFromCollectionId}
          />
          <Tabs
            mountOnEnter
            unmountOnExit
            activeKey={activeTab}
            onSelect={(event) => this.handleTabChange(event)}
            id="wellplateDetailsTab"
            className="has-config-overlay"
          >
            {tabContents}
          </Tabs>
          <CommentModal element={wellplate} />
        </div>
      </ElementDetailCard>
    );
  }
}

WellplateDetails.propTypes = {
  wellplate: PropTypes.instanceOf(WellplateModel).isRequired,
  openedFromCollectionId: PropTypes.number,
};

WellplateDetails.defaultProps = {
  openedFromCollectionId: null,
};
