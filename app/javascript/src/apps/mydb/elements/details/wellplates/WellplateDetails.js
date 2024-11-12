/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import html2pdf from 'html2pdf.js/src';
import PropTypes from 'prop-types';
import {
  Card, ListGroup, ListGroupItem, Button, ButtonToolbar, Tabs, Tab, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import { findIndex } from 'lodash';
import Immutable from 'immutable';
import { StoreContext } from 'src/stores/mobx/RootStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
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
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import Attachment from 'src/models/Attachment';
import Utils from 'src/utilities/Functions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ConfirmClose from 'src/components/common/ConfirmClose';
import ExportSamplesButton from 'src/apps/mydb/elements/details/ExportSamplesButton';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import WellplateModel from 'src/models/Wellplate';
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import { EditUserLabels, ShowUserLabels } from 'src/components/UserLabels';

export default class WellplateDetails extends Component {
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

  wellplateHeader(wellplate) {
    const displaySaveButton = wellplate.isEdited || wellplate.isNew
    const datetp = formatTimeStampsOfElement(wellplate || {});

    return (
      <div className="d-flex justify-content-between">
        <div className="d-flex justify-content-start gap-1">
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="screenDatesx">{datetp}</Tooltip>}>
            <span>
              <i className="icon-wellplate" />
              <span className="mx-2">{wellplate.name}</span>
            </span>
          </OverlayTrigger>
          <ShowUserLabels element={wellplate} />
          <ElementCollectionLabels element={wellplate} placement="right" />
          <HeaderCommentSection element={wellplate} />
        </div>
        <div className="d-flex justify-content-end gap-1">
          <PrintCodeButton element={wellplate} />
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
            <Button variant="info" size="xxsm" onClick={() => this.props.toggleFullScreen()}>
              <i className="fa fa-expand" />
            </Button>
          </OverlayTrigger>
          {displaySaveButton &&
            <OverlayTrigger placement="bottom" overlay={<Tooltip id="saveWellplate">Save Wellplate</Tooltip>}>
              <Button
                variant="warning"
                size="xxsm"
                onClick={() => this.handleSubmit()}
              >
                <i className="fa fa-floppy-o " />
              </Button>
            </OverlayTrigger>
          }
          <ConfirmClose el={wellplate} />
        </div>
      </div>
    );
  }


  render() {
    const { wellplate, showWellplate, visible } = this.state;
    const printButtonDisabled = wellplate.width > 12;
    const readoutTitles = wellplate.readout_titles;
    const exportButton = (wellplate && wellplate.isNew)
      ? null : <ExportSamplesButton type="wellplate" id={wellplate.id} />;

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
          <Card className="overflow-scroll h-100">
            <Card.Body>
              <WellplateList
                wells={wellplate.wells}
                readoutTitles={readoutTitles}
                handleWellsChange={(w) => this.handleWellsChange(w)}
              />
            </Card.Body>
          </Card>
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

    const tabTitlesMap = {};
    addSegmentTabs(wellplate, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });

    // eslint-disable-next-line react/destructuring-assignment
    const activeTab = (this.state.activeTab !== 0 && this.state.activeTab) || visible[0];

    return (
      <Card variant={wellplate.isPendingToSave ? 'info' : 'primary'} className="detail-card">
        <Card.Header>{this.wellplateHeader(wellplate)}</Card.Header>
        <Card.Body>
          <ElementDetailSortTab
            type="wellplate"
            availableTabs={Object.keys(tabContentsMap)}
            tabTitles={tabTitlesMap}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          <Tabs
            mountOnEnter
            unmountOnExit
            activeKey={activeTab}
            onSelect={(event) => this.handleTabChange(event)}
            id="wellplateDetailsTab"
          >
            {tabContents}
          </Tabs>
          <ButtonToolbar className='gap-1'>
            <Button variant="primary" onClick={() => DetailActions.close(wellplate)}>Close</Button>
            {
              wellplate.changed ? (
                <Button variant="warning" onClick={() => this.handleSubmit()}>
                  {wellplate.isNew ? 'Create' : 'Save'}
                </Button>
              ) : <div />
            }
            {exportButton}
            <Button
              variant="primary"
              onClick={() => this.handlePrint()}
              disabled={printButtonDisabled}
            >
              Print Wells
            </Button>
          </ButtonToolbar>
          <CommentModal element={wellplate} />
        </Card.Body>
      </Card>
    );
  }
}

WellplateDetails.propTypes = {
  wellplate: PropTypes.instanceOf(WellplateModel).isRequired,
  toggleFullScreen: PropTypes.func.isRequired,
};
