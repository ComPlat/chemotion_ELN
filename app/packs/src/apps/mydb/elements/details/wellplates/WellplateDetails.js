/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import html2pdf from 'html2pdf.js/src';
import PropTypes from 'prop-types';
import {
  Well, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, Tooltip, OverlayTrigger
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
import ExportSamplesBtn from 'src/apps/mydb/elements/details/ExportSamplesBtn';
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

export default class WellplateDetails extends Component {
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

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { wellplate } = this.state;
    const nextWellplate = nextProps.wellplate;
    if (nextWellplate.id !== wellplate.id || nextWellplate.updated_at !== wellplate.updated_at) {
      this.setState({
        wellplate: nextWellplate
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
    switch (type) {
      case 'name':
        wellplate.name = value === '' ? 'New Wellplate' : value;
        break;
      case 'description':
        wellplate.description = value;
        break;
      case 'readoutTitles':
        wellplate.readout_titles = value;
        break;
      default:
        break;
    }
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

      prevState.wellplate.attachments = [
        ...prevState.wellplate.attachments || [],
        ...newAttachments
      ];

      prevState.wellplate.changed = true;

      return { wellplate: prevState.wellplate };
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
    const saveBtnDisplay = wellplate.isEdited || wellplate.isNew ? '' : 'none';
    const datetp = formatTimeStampsOfElement(wellplate || {});

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="screenDatesx">{datetp}</Tooltip>}>
          <span>
            <i className="icon-wellplate" />
            &nbsp;&nbsp;
            <span>{wellplate.name}</span>
            &nbsp;&nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={wellplate} placement="right" />
        <HeaderCommentSection element={wellplate} />
        <ConfirmClose el={wellplate} />
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="saveWellplate">Save Wellplate</Tooltip>}>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.handleSubmit()}
            style={{ display: saveBtnDisplay }}
          >
            <i className="fa fa-floppy-o " />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => this.props.toggleFullScreen()}>
            <i className="fa fa-expand" />
          </Button>
        </OverlayTrigger>
        <PrintCodeButton element={wellplate} />
      </div>
    );
  }

  renderAttachmentsTab(wellplate) { /* eslint-disable react/jsx-no-bind */
    return (
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
    );
  } /* eslint-enable */

  render() {
    const {
      wellplate, showWellplate, visible
    } = this.state;
    const printButtonDisabled = wellplate.width > 12;
    const readoutTitles = wellplate.readout_titles;
    const exportButton = (wellplate && wellplate.isNew)
      ? null : <ExportSamplesBtn type="wellplate" id={wellplate.id} />;

    const tabContentsMap = {
      designer: (
        <Tab eventKey="designer" title="Designer" key={`designer_${wellplate.id}`}>
          {
            !wellplate.isNew && <CommentSection section="wellplate_designer" element={wellplate} />
          }
          <Well id="wellplate-designer" style={{ overflow: 'scroll' }}>
            <Wellplate
              show={showWellplate}
              size={wellplate.size}
              readoutTitles={readoutTitles}
              wells={wellplate.wells}
              handleWellsChange={(w) => this.handleWellsChange(w)}
              cols={wellplate.width}
              width={60}
            />
          </Well>
        </Tab>
      ),
      list: (
        <Tab eventKey="list" title="List" key={`list_${wellplate.id}`}>
          {
            !wellplate.isNew && <CommentSection section="wellplate_list" element={wellplate} />
          }
          <Well style={{ overflow: 'scroll', height: '100%', maxHeight: 'calc(100vh - 375px)' }}>
            <WellplateList
              wells={wellplate.wells}
              readoutTitles={readoutTitles}
              handleWellsChange={(w) => this.handleWellsChange(w)}
            />
          </Well>
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
          <PrivateNoteElement element={wellplate} disabled={wellplate.can_update} />
          {' '}
          {/* For samples and reactions (<element>): disabled={!<element>.can_update} */}
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${wellplate.id}`}>
          {
            !wellplate.isNew && <CommentSection section="wellplate_analyses" element={wellplate} />
          }
          <ListGroupItem style={{ paddingBottom: 20 }}>
            <WellplateDetailsContainers
              wellplate={wellplate}
              parent={this}
            />
          </ListGroupItem>
        </Tab>
      ),
      attachments: (
        <Tab eventKey="attachments" title="Attachments" key={`attachments_${wellplate.id}`}>
          {this.renderAttachmentsTab(wellplate)}
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
      <Panel bsStyle={wellplate.isPendingToSave ? 'info' : 'primary'} className="eln-panel-detail">
        <Panel.Heading>{this.wellplateHeader(wellplate)}</Panel.Heading>
        <Panel.Body>
          <ElementDetailSortTab
            type="wellplate"
            availableTabs={Object.keys(tabContentsMap)}
            tabTitles={tabTitlesMap}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          <Tabs activeKey={activeTab} onSelect={(event) => this.handleTabChange(event)} id="wellplateDetailsTab">
            {tabContents}
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(wellplate)}>Close</Button>
            {
              wellplate.changed ? (
                <Button bsStyle="warning" onClick={() => this.handleSubmit()}>
                  {wellplate.isNew ? 'Create' : 'Save'}
                </Button>
              ) : <div />
            }
            {exportButton}
            <Button
              bsStyle="primary"
              onClick={() => this.handlePrint()}
              disabled={printButtonDisabled}
            >
              Print Wells
            </Button>
          </ButtonToolbar>
          <CommentModal element={wellplate} />
        </Panel.Body>
      </Panel>
    );
  }
}

WellplateDetails.propTypes = {
  wellplate: PropTypes.instanceOf(WellplateModel).isRequired,
  toggleFullScreen: PropTypes.func.isRequired,
};
