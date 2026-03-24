/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-restricted-globals */
/* eslint-disable camelcase */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ListGroupItem,
  Tabs,
  Tab,
} from 'react-bootstrap';
import { cloneDeep, findIndex, merge } from 'lodash';
import Immutable from 'immutable';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  GenUIProvider, GenInterface, GenToolbar, browseElement
} from 'chem-generic-ui';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import GenericElDetailsContainers from 'src/components/generic/GenericElDetailsContainers';
import GenericEl from 'src/models/GenericEl';
import Attachment from 'src/models/Attachment';
import { notification, renderFlowModal } from 'src/apps/generic/Utils';
import GenericAttachments from 'src/components/generic/GenericAttachments';
import { SegmentTabs } from 'src/components/generic/SegmentDetails';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import { EditUserLabels } from 'src/components/UserLabels';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';

const onNaviClick = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const { genericEls = [] } = UserStore.getState();
  const elementAction = browseElement(currentCollection, isSync, type, id, genericEls);
  if (elementAction != null && ElementActions[elementAction]) {
    ElementActions[elementAction](id);
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
    this.setAttachmentDeleted = this.setAttachmentDeleted.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onChangeUI);
    ElementStore.listen(this.onChangeElement);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
    ElementStore.unlisten(this.onChangeElement);
  }

  handleElChanged(el, cb) {
    const genericEl = el;
    genericEl.changed = true;
    this.setState({ genericEl }, cb);
  }

  handleGenericElChanged(el, cb) {
    const genericEl = el;
    genericEl.changed = true;
    this.setState({ genericEl }, () => {
      // ElementActions.opGenericAnalysis(el);
      renderFlowModal(genericEl, false);
      if (typeof cb === 'function') cb();
    });
  }

  handleSelect(eventKey, type) {
    UIActions.selectTab({ tabKey: eventKey, type });
    UIActions.showGenericWorkflowModal.defer(false);
    this.setState({ activeTab: eventKey });
  }

  handleRetrieveRevision(revision, cb) {
    const { genericEl } = this.state;
    genericEl.properties = revision.properties;
    genericEl.metadata = revision.metadata;
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

    el.name = el.name.trim();

    let ais = el.analysisContainers() || [];
    ais = ais.filter((x) => !x.is_deleted).map((x) => x.id);
    (Object.keys(el.properties.layers) || {}).forEach((key) => {
      if (el.properties.layers[key].ai) {
        el.properties.layers[key].ai = el.properties.layers[
          key
        ].ai.filter((x) => ais.includes(x));
      } else {
        el.properties.layers[key].ai = [];
      }
      el.properties.layers[key].fields = (
        el.properties.layers[key].fields || []
      ).map((f) => {
        const field = f;
        if (
          field.type === 'text'
          && typeof field.value !== 'undefined'
          && field.value != null
        ) {
          field.value = field.value?.trim();
        }
        return field;
      });
    });
    if (el && el.isNew) {
      ElementActions.createGenericEl(el);
    } else {
      ElementActions.updateGenericEl(el, closeView);
    }
    if (el.is_new || closeView) {
      DetailActions.close(el, true);
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
        ...newAttachments,
      ];
      updatedGenericEl.changed = true;
      return { genericEl: updatedGenericEl };
    });
  }

  handleAttachmentDelete(attachment) {
    this.setAttachmentDeleted(attachment, true);
  }

  handleAttachmentUndoDelete(attachment) {
    this.setAttachmentDeleted(attachment, false);
  }

  handleAttachmentEdit(attachment) {
    const { genericEl } = this.state;
    genericEl.changed = true;
    genericEl.attachments = genericEl.attachments.map((currentAttachment) => (
      currentAttachment.id === attachment.id ? attachment : currentAttachment
    ));
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
      (o) => o.segment_klass_id === se.segment_klass_id,
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

  setAttachmentDeleted(attachment, isDeleted) {
    this.setState((prevState) => {
      const updatedGenericEl = cloneDeep(prevState.genericEl);
      updatedGenericEl.attachments = updatedGenericEl.attachments.map((a) => (
        a.id === attachment.id ? { ...a, is_deleted: isDeleted } : a
      ));
      updatedGenericEl.changed = true;
      return { genericEl: updatedGenericEl };
    });
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
        <GenUIProvider>
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
        </GenUIProvider>
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

  render() {
    const { genericEl, visible } = this.state;
    const { openedFromCollectionId } = this.props;
    /**
     *  tabContents is a object containing all (visible) segment tabs
     */
    let tabContents = {
      properties: this.propertiesTab.bind(this),
      analyses: this.containersTab.bind(this),
      attachments: this.attachmentsTab.bind(this),
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

    if (
      !tabKeyContentList.includes(activeTab)
      && tabKeyContentList.length > 0
    ) {
      activeTab = tabKeyContentList[0];
    }
    return (
      <>
        <ViewSpectra
          sample={genericEl}
          handleSampleChanged={this.handleElChanged}
          handleSubmit={this.handleSubmit}
        />
        <NMRiumDisplayer
          sample={genericEl}
          handleSampleChanged={this.handleElChanged}
          handleSubmit={this.handleSubmit}
        />
        <ElementDetailCard
          element={genericEl}
          isPendingToSave={genericEl.isPendingToSave}
          title={genericEl.short_label}
          titleTooltip={formatTimeStampsOfElement(genericEl || {})}
          onSave={() => this.handleSubmit()}
          saveDisabled={!genericEl.isNew && !genericEl.can_update}
          showCalendar
        >
          <div className="tabs-container--with-borders">
            <ElementDetailSortTab
              type={genericEl.type}
              availableTabs={Object.keys(tabContents)}
              onTabPositionChanged={this.onTabPositionChanged}
              openedFromCollectionId={openedFromCollectionId}
            />
            <Tabs
              activeKey={activeTab}
              onSelect={(key) => this.handleSelect(key, genericEl.type)}
              id="GenericElementDetailsXTab"
            >
              {tabContentList}
            </Tabs>
          </div>
        </ElementDetailCard>
      </>
    );
  }
}

GenericElDetails.propTypes = {
  genericEl: PropTypes.object,
  openedFromCollectionId: PropTypes.number,
};

GenericElDetails.defaultProps = {
  genericEl: {},
  openedFromCollectionId: null,
};
