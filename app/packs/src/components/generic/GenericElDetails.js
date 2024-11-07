/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-restricted-globals */
/* eslint-disable camelcase */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ButtonToolbar,
  ListGroupItem,
  Tabs,
  Tab,
  ListGroup,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { findIndex, merge } from 'lodash';
import Aviator from 'aviator';
import Immutable from 'immutable';
import {
  GenInterface, GenButtonReload, GenButtonExport, GenButtonDrawflow, GenFlowViewerBtn
} from 'chem-generic-ui';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ConfirmClose from 'src/components/common/ConfirmClose';
import GenericElDetailsContainers from 'src/components/generic/GenericElDetailsContainers';
import GenericEl from 'src/models/GenericEl';
import Attachment from 'src/models/Attachment';
import CopyElementModal from 'src/components/common/CopyElementModal';
import { notification, renderFlowModal } from 'src/apps/generic/Utils';
import GenericAttachments from 'src/components/generic/GenericAttachments';
import { SegmentTabs } from 'src/components/generic/SegmentDetails';
import RevisionViewerBtn from 'src/components/generic/RevisionViewerBtn';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import Panel from 'src/components/legacyBootstrap/Panel'
import { EditUserLabels, ShowUserLabels } from 'src/components/UserLabels';

const onNaviClick = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const collectionUrl = !isNaN(id)
    ? `${currentCollection.id}/${type}/${id}`
    : `${currentCollection.id}/${type}`;
  Aviator.navigate(
    isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`,
    { silent: true },
  );
  if (type === 'reaction') {
    ElementActions.fetchReactionById(id);
  } else if (type === 'sample') {
    ElementActions.fetchSampleById(id);
  } else {
    ElementActions.fetchGenericElById(id);
  }
};

export default class GenericElDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
      activeTab: 0,
      // List of all visible segment tabs.
      visible: Immutable.List()
    };
    this.onChangeUI = this.onChangeUI.bind(this);
    this.onChangeElement = this.onChangeElement.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleReload = this.handleReload.bind(this);
    this.handleAttachmentDrop = this.handleAttachmentDrop.bind(this);
    this.handleAttachmentDelete = this.handleAttachmentDelete.bind(this);
    this.handleAttachmentEdit = this.handleAttachmentEdit.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    this.handleRetrieveRevision = this.handleRetrieveRevision.bind(this);
    this.handleGenericElChanged = this.handleGenericElChanged.bind(this);
    this.handleElChanged = this.handleElChanged.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleExport = this.handleExport.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onChangeUI);
    ElementStore.listen(this.onChangeElement);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
    ElementStore.unlisten(this.onChangeElement);
  }

  /**
   * Changes the visible segment tabs
   * @param visible {Array} List of all visible segment tabs
   */
  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  onChangeElement(state) {
    const { genericEl } = this.state;
    if (state.currentElement) {
      if (
        state.currentElement !== genericEl
        && state.currentElement.klassType === 'GenericEl'
        && state.currentElement.type != null
      ) {
        this.setState({ genericEl: state.currentElement });
      }
    }
  }

  onChangeUI(state) {
    const { activeTab, genericEl } = this.state;
    if (state[genericEl.type]) {
      if (state[genericEl.type].activeTab !== activeTab) {
        this.setState({
          activeTab: state[genericEl.type].activeTab,
        });
      }
    }
  }

  handleElChanged(el) {
    const genericEl = el;
    genericEl.changed = true;
    this.setState({ genericEl });
  }

  handleGenericElChanged(el) {
    const genericEl = el;
    genericEl.changed = true;
    this.setState({ genericEl }, () => {
      // ElementActions.opGenericAnalysis(el);
      renderFlowModal(genericEl, false);
    });
  }

  handleSelect(eventKey, type) {
    UIActions.selectTab({ tabKey: eventKey, type });
    UIActions.showGenericWorkflowModal.defer(false);
    this.setState({ activeTab: eventKey });
  }

  handleRetrieveRevision(revision, cb) {
    const { genericEl } = this.state;
    genericEl.properties = revision;
    genericEl.changed = true;
    this.setState({ genericEl }, cb);
  }

  handleReload(genericEl) {
    this.setState({ genericEl }, () => ElementActions.setCurrentElement(genericEl));
  }

  handleSubmit(closeView = false) {
    const { genericEl } = this.state;

    const el = new GenericEl(genericEl);
    if (!el.isValidated()) {
      notification({
        title: 'Save failed!',
        lvl: 'error',
        msg: 'Please fill out all required fields!',
        uid: 'save_mof_notification',
      });
      return false;
    }
    LoadingActions.start();
    genericEl.name = genericEl.name.trim();
    // filter is_deleted analysis
    const { container } = genericEl;

    let ais = (container && container.children && container.children[0].children) || [];
    ais = ais.filter((x) => !x.is_deleted).map((x) => x.id); // get ai is not deleted
    (Object.keys(genericEl.properties.layers) || {}).forEach((key) => {
      if (genericEl.properties.layers[key].ai) {
        genericEl.properties.layers[key].ai = genericEl.properties.layers[
          key
        ].ai.filter((x) => ais.includes(x));
      } else {
        genericEl.properties.layers[key].ai = [];
      }
      genericEl.properties.layers[key].fields = (
        genericEl.properties.layers[key].fields || []
      ).map((f) => {
        const field = f;
        if (
          field.type === 'text'
          && typeof field.value !== 'undefined'
          && field.value != null
        ) {
          field.value = field.value.trim();
        }
        return field;
      });
    });
    if (genericEl && genericEl.isNew) {
      ElementActions.createGenericEl(genericEl);
    } else {
      ElementActions.updateGenericEl(genericEl, closeView);
    }
    if (genericEl.is_new || closeView) {
      DetailActions.close(genericEl, true);
    }
    return true;
  }

  handleExport() {
    const { genericEl } = this.state;
    ElementActions.exportElement(genericEl, 'Element', 'docx');
  }

  handleAttachmentDrop(files) {
    const { genericEl } = this.state;
    files.map((file) => genericEl.attachments.push(Attachment.fromFile(file)));
    // this.handleGenericElChanged(genericEl);
    this.handleElChanged(genericEl);
  }

  handleAttachmentDelete(attachment, isDelete = true) {
    const { genericEl } = this.state;
    const index = genericEl.attachments.indexOf(attachment);
    genericEl.attachments[index].is_deleted = isDelete;
    // this.handleGenericElChanged(genericEl);
    this.handleElChanged(genericEl);
  }

  handleAttachmentEdit(attachment) {
    const { genericEl } = this.state;
    genericEl.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) return attachment;
    });
    // this.handleGenericElChanged(genericEl);
    this.handleElChanged(genericEl);
    this.forceUpdate();
  }

  handleSegmentsChange(se, cb) {
    const { genericEl } = this.state;
    const { segments } = genericEl;
    const idx = findIndex(
      segments,
      (o) => o.segment_klass_id === se.segment_klass_id
    );
    if (idx >= 0) {
      segments.splice(idx, 1, se);
    } else {
      segments.push(se);
    }
    genericEl.segments = segments;
    genericEl.changed = true;
    if (cb) this.setState({ genericEl }, cb());
    else this.setState({ genericEl });
  }

  elementalToolbar(genericEl) {
    return (
      <ButtonToolbar style={{ margin: '5px 0px' }}>
        <GenButtonExport
          generic={genericEl}
          fnExport={this.handleExport}
        />
        <GenFlowViewerBtn generic={genericEl} fnClick={renderFlowModal} />
        <RevisionViewerBtn
          fnRetrieve={this.handleRetrieveRevision}
          generic={genericEl}
        />
        <GenButtonReload
          klass={genericEl.element_klass}
          generic={genericEl}
          fnReload={this.handleReload}
        />
        <GenButtonDrawflow
          generic={genericEl}
          genericType="Element"
          fnSave={this.handleReload}
        />
      </ButtonToolbar>
    );
  }

  elementalPropertiesItem(genericEl) {
    const options = [];
    options.push({
      generic: genericEl,
      type: 'text',
      isEditable: true,
      isRequire: false,
      field: 'name',
    });
    const lys = Object.keys(genericEl.properties.layers);
    const aiComs = {};
    lys.forEach((x) => {
      const ly = genericEl.properties.layers[x];
      const ai = ly.ai || [];
      if (ai.length < 1) {
        aiComs[ly.key] = null;
      } else {
        aiComs[ly.key] = (
          <GenericElDetailsContainers
            genericEl={genericEl}
            readOnly={false}
            handleElChanged={this.handleElChanged}
            noAct
            linkedAis={ai}
            handleSubmit={this.handleSubmit}
          />
        );
      }
    });
    const layersLayout = (
      <GenInterface
        generic={genericEl}
        fnChange={this.handleGenericElChanged}
        extLayers={options}
        genId={genericEl.id || 0}
        isPreview={false}
        isActiveWF
        fnNavi={onNaviClick}
        aiComp={aiComs}
      />
    );
    return (
      <div>
        <div>{this.elementalToolbar(genericEl)}</div>
        {layersLayout}
        <EditUserLabels
          element={genericEl}
          fnCb={this.handleGenericElChanged}
        />
      </div>
    );
  }

  propertiesTab(ind) {
    const { genericEl = {} } = this.state;
    return (
      <Tab eventKey={ind} title="Properties" key={`Props_${genericEl.id}`}>
        {this.elementalPropertiesItem(genericEl)}
      </Tab>
    );
  }

  containersTab(ind) {
    const { genericEl } = this.state;
    return (
      <Tab eventKey={ind} title="Analyses" key={`Container_${genericEl.id}`}>
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <GenericElDetailsContainers
            // key={genericEl.id}
            genericEl={genericEl}
            readOnly={false}
            handleElChanged={this.handleElChanged}
            handleSubmit={this.handleSubmit}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  attachmentsTab(ind) {
    const { genericEl } = this.state;
    return (
      <Tab
        eventKey={ind}
        title="Attachments"
        key={`Attachment_${genericEl.id}`}
      >
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <GenericAttachments
            attachments={genericEl.attachments}
            onDrop={this.handleAttachmentDrop}
            onDelete={this.handleAttachmentDelete}
            onEdit={this.handleAttachmentEdit}
            readOnly={false}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  header(genericEl) {
    const iconClass = (genericEl.element_klass && genericEl.element_klass.icon_name) || '';
    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection
      && currentCollection.is_shared === false
      && currentCollection.is_locked === false
      && currentCollection.label !== 'All'
      ? currentCollection.id : null;
    const copyBtn = genericEl.can_copy && !genericEl.isNew ? (
      <CopyElementModal element={genericEl} defCol={defCol} />
    ) : null;

    const saveBtnDisplay = genericEl.changed && genericEl.can_update ? '' : 'none';
    const datetp = `Created at: ${genericEl.created_at} \n Updated at: ${genericEl.updated_at}`;
    return (
      <div>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="genericElDatesx">{datetp}</Tooltip>}
        >
          <span>
            <i className={iconClass} />
            &nbsp;
            <span>{genericEl.short_label}</span>
            &nbsp;
          </span>
        </OverlayTrigger>
        {genericEl.isNew ? null : <ElementCollectionLabels element={genericEl} />}
        <ShowUserLabels element={genericEl} />
        <ConfirmClose el={genericEl} />
        {copyBtn}
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="saveScreen">Save</Tooltip>}
        >
          <Button
            variant="warning"
            size="sm"
            onClick={() => this.handleSubmit()}
            style={{ display: saveBtnDisplay }}
          >
            <i className="fa fa-floppy-o" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        {genericEl.isNew
          ? null
          : <OpenCalendarButton isPanelHeader eventableId={genericEl.id} eventableType="Labimotion::Element" />}
      </div>
    );
  }

  render() {
    const { genericEl, visible } = this.state;
    const submitLabel = genericEl && genericEl.isNew ? 'Create' : 'Save';
    // eslint-disable-next-line max-len
    const saveBtnDisplay = (genericEl?.isNew || (genericEl?.can_update && genericEl?.changed)) ? { display: '' } : { display: 'none' };

    /**
     *  tabContents is a object containing all (visible) segment tabs
     */
    let tabContents = {
      properties: this.propertiesTab.bind(this),
      analyses: this.containersTab.bind(this),
      attachments: this.attachmentsTab.bind(this)
    };

    const segTabs = SegmentTabs(genericEl, this.handleSegmentsChange);
    tabContents = merge(tabContents, segTabs);

    const tabContentList = [];
    const tabKeyContentList = [];

    visible.forEach((value) => {
      const tabContent = tabContents[value];
      if (tabContent) {
        tabKeyContentList.push(value);
        tabContentList.push(tabContent(value));
      }
    });

    // Select 'activeTab' and ensure that it is visible
    let activeTab = this.state.activeTab;
    if (!tabKeyContentList.includes(activeTab) && tabKeyContentList.length > 0) {
      activeTab = tabKeyContentList[0];
    }
    return (
      <Panel
        className="panel-detail"
        variant={genericEl.isPendingToSave ? 'info' : 'primary'}
      >
        <Panel.Heading>{this.header(genericEl)}</Panel.Heading>
        <Panel.Body>
          <ListGroup>
            <ElementDetailSortTab
              type={genericEl.type}
              availableTabs={Object.keys(tabContents)}
              onTabPositionChanged={this.onTabPositionChanged}
            />
            <Tabs
              activeKey={activeTab}
              onSelect={(key) => this.handleSelect(key, genericEl.type)}
              id="GenericElementDetailsXTab"
            >
              {tabContentList}
            </Tabs>
          </ListGroup>
          <hr />
          <ButtonToolbar>
            <Button
              variant="primary"
              onClick={() => DetailActions.close(genericEl, true)}
            >
              Close
            </Button>
            <Button
              variant="warning"
              onClick={() => this.handleSubmit()}
              style={saveBtnDisplay}
            >
              {submitLabel}
            </Button>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

GenericElDetails.propTypes = {
  genericEl: PropTypes.object,
};

GenericElDetails.defaultProps = {
  genericEl: {},
};
