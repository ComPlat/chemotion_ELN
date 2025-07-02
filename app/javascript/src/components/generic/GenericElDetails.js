/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-restricted-globals */
/* eslint-disable camelcase */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ListGroupItem,
  Tabs,
  Tab,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { cloneDeep, findIndex, merge } from 'lodash';
import Aviator from 'aviator';
import Immutable from 'immutable';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  GenInterface, GenToolbar,
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
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
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
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
      activeTab: 0,
      // List of all visible segment tabs.
      visible: Immutable.List(),
      expandAll: undefined,
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
    this.handleAttachmentUndoDelete = this.handleAttachmentUndoDelete.bind(this);
    this.handleAttachmentImportComplete = this.handleAttachmentImportComplete.bind(this);
    this.handleElChanged = this.handleElChanged.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleExport = this.handleExport.bind(this);
    this.handleExpandAll = this.handleExpandAll.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onChangeUI);
    ElementStore.listen(this.onChangeElement);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
    ElementStore.unlisten(this.onChangeElement);
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
    // eslint-disable-next-line react/destructuring-assignment
    this.context.attachmentNotificationStore.clearMessages();

    genericEl.name = genericEl.name.trim();
    // filter is_deleted analysis
    const { container } = genericEl;

    let ais = (container && container.children && container.children[0].children) || [];
    ais = ais.filter(x => !x.is_deleted).map((x, i) => {
      if (x.extended_metadata) {
        x.extended_metadata.index = i;
      } else {
        x.extended_metadata = { index: i };
      }
      return x.id;
    });
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
          // console.log('field.value:', field.value);
          field.value = field.value?.trim();
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

  handleExpandAll(expanded) {
    this.setState({ expandAll: expanded });
  }

  handleAttachmentDrop(files) {
    this.setState((prevState) => {
      const newAttachments = files.map((file) => Attachment.fromFile(file));
      const updatedGenericEl = cloneDeep(prevState.genericEl);
      updatedGenericEl.attachments = [
        ...prevState.genericEl.attachments,
        ...newAttachments
      ];
      updatedGenericEl.changed = true;
      return { genericEl: updatedGenericEl };
    });
  }

  handleAttachmentDelete(attachment) {
    const { genericEl } = this.state;
    const index = genericEl.attachments.indexOf(attachment);
    genericEl.changed = true;
    genericEl.attachments[index].is_deleted = true;
    this.handleElChanged(genericEl);
  }

  handleAttachmentUndoDelete(attachment) {
    const { genericEl } = this.state;
    const index = genericEl.attachments.indexOf(attachment);
    genericEl.attachments[index].is_deleted = false;
    this.handleElChanged(genericEl);
  }

  handleAttachmentEdit(attachment) {
    const { genericEl } = this.state;
    genericEl.changed = true;
    genericEl.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) return attachment;
    });
    this.handleElChanged(genericEl);
    this.forceUpdate();
  }

  handleAttachmentImportComplete() {
    this.setState({ activeTab: 0 });
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

  elementalPropertiesItem(genericEl) {
    const { expandAll } = this.state;
    const options = [];
    options.push({
      generic: genericEl,
      type: 'text',
      isEditable: true,
      isRequire: false,
      field: 'name',
    });
    const lys = genericEl.properties && genericEl.properties.layers
      ? Object.keys(genericEl.properties.layers)
      : [];
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
        expandAll={expandAll}
      />
    );
    return (
      <div>
        <GenToolbar
          generic={genericEl}
          genericType="Element"
          klass={genericEl.element_klass}
          fnExport={this.handleExport}
          fnReload={this.handleReload}
          fnRetrieve={this.handleRetrieveRevision}
          onExpandAll={this.handleExpandAll}
        />
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
        <ListGroupItem className="pb-4">
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
            genericEl={genericEl}
            attachments={genericEl.attachments}
            onDrop={this.handleAttachmentDrop}
            onDelete={this.handleAttachmentDelete}
            onUndoDelete={this.handleAttachmentUndoDelete}
            onAttachmentImportComplete={this.handleAttachmentImportComplete}
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
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
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
          {!genericEl.isNew && (
            <ElementCollectionLabels element={genericEl} />
          )}
          <ShowUserLabels element={genericEl} />
        </div>
        <div className="d-flex align-items-center gap-2">
          {!genericEl.isNew && (
            <OpenCalendarButton
              isPanelHeader
              eventableId={genericEl.id}
              eventableType="Labimotion::Element"
            />
          )}
          {copyBtn}
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="saveScreen">Save</Tooltip>}
          >
            <Button
              variant="warning"
              size="xxsm"
              onClick={() => this.handleSubmit()}
              style={{ display: saveBtnDisplay }}
            >
              <i className="fa fa-floppy-o" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          <ConfirmClose el={genericEl} />
        </div>
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

    let { activeTab } = this.state;

    if (!tabKeyContentList.includes(activeTab) && tabKeyContentList.length > 0) {
      activeTab = tabKeyContentList[0];
    }
    return (
      <DetailCard
        isPendingToSave={genericEl.isPendingToSave}
        header={this.header(genericEl)}
        footer={(
          <>
            <Button
              variant="secondary"
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
          </>
        )}
      >
        <div className="tabs-container--with-borders">
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
        </div>
      </DetailCard>
    );
  }
}

GenericElDetails.propTypes = {
  genericEl: PropTypes.object,
};

GenericElDetails.defaultProps = {
  genericEl: {},
};
