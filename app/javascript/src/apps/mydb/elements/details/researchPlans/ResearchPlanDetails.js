/* eslint-disable react/destructuring-assignment */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ButtonToolbar, Button, Tooltip, OverlayTrigger, Tabs, Tab, Dropdown, ButtonGroup
} from 'react-bootstrap';
import { unionBy, findIndex } from 'lodash';
import Immutable from 'immutable';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ResearchPlanWellplates from 'src/apps/mydb/elements/details/researchPlans/wellplatesTab/ResearchPlanWellplates';
import ResearchPlanMetadata from 'src/apps/mydb/elements/details/researchPlans/ResearchPlanMetadata';
import Attachment from 'src/models/Attachment';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ConfirmClose from 'src/components/common/ConfirmClose';
import ResearchPlan from 'src/models/ResearchPlan';
import ResearchPlanDetailsAttachments from
  'src/apps/mydb/elements/details/researchPlans/attachmentsTab/ResearchPlanDetailsAttachments';
import ResearchPlanDetailsBody from
  'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsBody';
import ResearchPlanDetailsName from
  'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsName';
import ResearchPlanDetailsContainers from
  'src/apps/mydb/elements/details/researchPlans/analysesTab/ResearchPlanDetailsContainers';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import CopyElementModal from 'src/components/common/CopyElementModal';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { commentActivation } from 'src/utilities/CommentHelper';
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import { EditUserLabels, ShowUserLabels } from 'src/components/UserLabels';

export default class ResearchPlanDetails extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const { researchPlan } = props;
    this.state = {
      researchPlan,
      visible: Immutable.List(),
      currentUser: (UserStore.getState() && UserStore.getState().currentUser) || {},
    };
    this.handleSwitchMode = this.handleSwitchMode.bind(this);
    this.handleResearchPlanChange = this.handleResearchPlanChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleBodyChange = this.handleBodyChange.bind(this);
    this.handleBodyAdd = this.handleBodyAdd.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
  }

  componentDidMount() {
    const { researchPlan } = this.props;
    const { currentUser } = this.state;

    if (MatrixCheck(currentUser.matrix, commentActivation) && !researchPlan.isNew) {
      CommentActions.fetchComments(researchPlan);
    }
  }

  componentDidUpdate(prevProps) {
    const { researchPlan } = this.props;
    if (researchPlan !== prevProps.researchPlan) {
      this.setState({ researchPlan });
    }
  }

  handleResearchPlanChange(el) {
    const researchPlan = el;
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleSegmentsChange(se) {
    const { researchPlan } = this.state;
    const { segments } = researchPlan;
    const idx = findIndex(segments, (o) => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    researchPlan.segments = segments;
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleSwitchMode(mode) {
    const { researchPlan } = this.state;
    researchPlan.mode = mode;
    this.setState({ researchPlan });
  }

  // handle functions

  handleSubmit() {
    const { researchPlan } = this.state;
    LoadingActions.start();
    this.context.attachmentNotificationStore.clearMessages();

    if (researchPlan.isNew) {
      ElementActions.createResearchPlan(researchPlan);
    } else {
      ElementActions.updateResearchPlan(researchPlan);
    }

    if (researchPlan.is_new) {
      const force = true;
      DetailActions.close(researchPlan, force);
    }
  }

  handleSelect(eventKey) {
    UIActions.selectTab({ tabKey: eventKey, type: 'research_plan' });
    this.setState({
      activeTab: eventKey
    });
  }

  // handle name actions

  handleNameChange(value) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    researchPlan.name = value;
    this.setState({ researchPlan });
  }

  // handle body actions

  handleBodyChange(value, idOfFieldToReplace, attachments) {
    const { researchPlan } = this.state;
    researchPlan.upsertAttachments(attachments);

    const index = researchPlan.body.findIndex((field) => field.id === idOfFieldToReplace);
    if (index === -1) { return; }

    researchPlan.body[index].value = value;
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleBodyDrop(source, target) {
    const { researchPlan } = this.state;
    researchPlan.body.splice(target, 0, researchPlan.body.splice(source, 1)[0]);
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleBodyAdd(type) {
    const { researchPlan } = this.state;
    researchPlan.addBodyField(type);
    researchPlan.changed = true;
    this.setState({ researchPlan });
  }

  handleBodyDelete(id) {
    const { researchPlan } = this.state;
    researchPlan.removeFieldFromBody(id);
    this.setState({ researchPlan });
  }

  // handle attachment actions
  handleAttachmentDrop(files) {
    this.setState((prevState) => {
      const newAttachments = files.map((file) => Attachment.fromFile(file));
      const updatedAttachments = prevState.researchPlan.attachments.concat(newAttachments);
      const updatedResearchPlan = new ResearchPlan({
        ...prevState.researchPlan,
        attachments: updatedAttachments,
        changed: true
      });

      return { researchPlan: updatedResearchPlan };
    });
  }

  handleAttachmentDelete(attachment) {
    const { researchPlan } = this.state;
    const index = researchPlan.attachments.indexOf(attachment);
    researchPlan.changed = true;
    researchPlan.attachments[index].is_deleted = true;
    this.setState({ researchPlan });
  }

  handleAttachmentUndoDelete(attachment) {
    const { researchPlan } = this.state;
    const index = researchPlan.attachments.indexOf(attachment);
    researchPlan.attachments[index].is_deleted = false;
    this.setState({ researchPlan });
  }

  handleAttachmentEdit(attachment) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    // update only this attachment
    researchPlan.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) return attachment;
      return null;
    });
    this.setState({ researchPlan });
    this.forceUpdate();
  }

  handleExport(exportFormat) {
    const { researchPlan } = this.state;
    ResearchPlansFetcher.export(researchPlan, exportFormat);
  }

  handleExportField(field) {
    const { researchPlan } = this.props;
    ResearchPlansFetcher.exportTable(researchPlan, field);
  }

  handleCopyToMetadata(id, fieldName) {
    const { researchPlan } = this.state;
    const researchPlanMetadata = researchPlan.research_plan_metadata;
    const args = { research_plan_id: researchPlanMetadata.research_plan_id };
    const index = researchPlan.body.findIndex((field) => field.id === id);
    const value = researchPlan.body[index]?.value?.ops[0]?.insert?.trim() || '';
    if (fieldName === 'name') {
      researchPlanMetadata.title = researchPlan.name;
      args.title = researchPlan.name.trim();
    } else if (fieldName === 'subject') {
      researchPlanMetadata.subject = value;
      args.subject = value;
    } else {
      const type = researchPlan.body[index]?.title?.trim() || '';
      const newItem = this.newItemByType(fieldName, value, type);

      const currentCollection = researchPlanMetadata[fieldName]
        ? researchPlanMetadata[fieldName] : [];
      const newCollection = currentCollection.concat(newItem);
      researchPlanMetadata[fieldName] = newCollection;
      args[`${fieldName}`] = researchPlanMetadata[fieldName];
    }

    ResearchPlansFetcher.postResearchPlanMetadata(args).then((result) => {
      if (result.error) {
        // eslint-disable-next-line no-alert
        alert(result.error);
      }
    });
  }

  handleAttachmentImportComplete() {
    this.setState({ activeTab: 0 });
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  dropWellplate(wellplate) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    researchPlan.wellplates = unionBy(researchPlan.wellplates, [wellplate], 'id');
    this.setState({ researchPlan });
  }

  deleteWellplate(wellplate) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    const wellplateIndex = researchPlan.wellplates.indexOf(wellplate);
    researchPlan.wellplates.splice(wellplateIndex, 1);
    this.setState({ researchPlan });
  }

  importWellplate(wellplateId) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;

    LoadingActions.start();
    ElementActions.importWellplateIntoResearchPlan(
      researchPlan.id,
      wellplateId,
      () => {
        this.setState({ activeTab: 0 });
        LoadingActions.stop();
      }
    );
  }

  // eslint-disable-next-line class-methods-use-this
  newItemByType(fieldName, value, type) {
    switch (fieldName) {
      case 'description':
        return {
          description: value,
          descriptionType: type
        };
      case 'alternate_identifier':
        return {
          alternateIdentifier: value,
          alternateIdentifierType: type
        };
      case 'related_identifier':
        return {
          relatedIdentifier: value,
          relatedIdentifierType: type
        };
      default:
        return {};
    }
  }

  renderExportButton(disabled) {
    return (
      <Dropdown
        id="research-plan-export-dropdown"
        disabled={disabled}
      >
        <Dropdown.Toggle variant="light">
          Export
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => this.handleExport('docx')}>
            as .docx
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('odt')}>
            as .odt
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('html')}>
            as HTML
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('markdown')}>
            as Markdown
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.handleExport('latex')}>
            as LaTeX
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  renderResearchPlanMain(researchPlan) { /* eslint-disable react/jsx-no-bind */
    const {
      name, body, changed, attachments
    } = researchPlan;
    const edit = researchPlan.mode === 'edit';

    const editTooltip = (<Tooltip id="edit-tooltip">Click to switch to edit mode</Tooltip>);
    const viewTooltip = (<Tooltip id="view-tooltip">Click to switch to view mode</Tooltip>);

    const EditButton = (
      <Button
        variant={researchPlan.mode === 'edit' ? 'warning' : 'light'}
        style={{
          pointerEvents: 'none',
          backgroundColor: researchPlan.mode !== 'edit' ? '#E8E8E8' : undefined,
        }}
      >
        <i className="fa fa-pencil" />
      </Button>
    );

    const ViewButton = (
      <Button
        variant={researchPlan.mode === 'view' ? 'info' : 'light'}
        style={{
          pointerEvents: 'none',
          backgroundColor: researchPlan.mode !== 'view' ? '#E8E8E8' : undefined,
        }}
      >
        <i className="fa fa-eye fa-sm" />
      </Button>
    );

    const btnMode = (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (researchPlan.mode === 'view') {
            this.handleSwitchMode('edit');
          } else {
            this.handleSwitchMode('view');
          }
        }}
        onKeyPress={() => {}}
      >
        <OverlayTrigger placement="top" overlay={researchPlan.mode === 'view' ? editTooltip : viewTooltip}>
          <ButtonGroup>
            {EditButton}
            {ViewButton}
          </ButtonGroup>
        </OverlayTrigger>
      </div>
    );

    return (
      <>
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-fill">
            <ResearchPlanDetailsName
              value={name}
              disabled={researchPlan.isMethodDisabled('name')}
              onChange={this.handleNameChange}
              edit={edit}
              onCopyToMetadata={this.handleCopyToMetadata.bind(this)}
            />
          </div>
          <ButtonToolbar className="d-flex justify-content-center align-items-end gap-1">
            {btnMode}
            {this.renderExportButton(changed)}
          </ButtonToolbar>
        </div>

        <ResearchPlanDetailsBody
          body={body}
          attachments={attachments}
          disabled={researchPlan.isMethodDisabled('body')}
          onChange={this.handleBodyChange}
          onDrop={this.handleBodyDrop.bind(this)}
          onAdd={this.handleBodyAdd}
          onDelete={this.handleBodyDelete.bind(this)}
          onExport={this.handleExportField.bind(this)}
          onCopyToMetadata={this.handleCopyToMetadata.bind(this)}
          edit={edit}
          copyableFields={[
            { title: 'Subject', fieldName: 'subject' },
            {
              title: 'Alternate Identifier',
              fieldName: 'alternate_identifier',
            },
            { title: 'Related Identifier', fieldName: 'related_identifier' },
            { title: 'Description', fieldName: 'description' },
          ]}
          researchPlan={researchPlan}
        />
      </>
    );
  } /* eslint-enable */

  renderAnalysesTab(researchPlan) {
    return (
      <ResearchPlanDetailsContainers
        handleSubmit={this.handleSubmit}
        handleResearchPlanChange={this.handleResearchPlanChange}
        researchPlan={researchPlan}
        readOnly={false}
      />
    );
  }

  renderAttachmentsTab(researchPlan) { /* eslint-disable react/jsx-no-bind */
    return (
      <ResearchPlanDetailsAttachments
        researchPlan={researchPlan}
        attachments={researchPlan.attachments}
        onDrop={this.handleAttachmentDrop.bind(this)}
        onDelete={this.handleAttachmentDelete.bind(this)}
        onUndoDelete={this.handleAttachmentUndoDelete.bind(this)}
        onAttachmentImportComplete={this.handleAttachmentImportComplete.bind(this)}
        onEdit={this.handleAttachmentEdit.bind(this)}
        readOnly={false}
      />
    );
  } /* eslint-enable */

  renderPanelHeading(researchPlan) {
    const { currentCollection } = UIStore.getState();
    const rootCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;
    const titleTooltip = formatTimeStampsOfElement(researchPlan || {});
    const copyBtn = (
      <CopyElementModal
        element={researchPlan}
        defCol={rootCol}
      />
    );

    return (
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="rpDates">{titleTooltip}</Tooltip>}>
            <span>
              <i className="fa fa-file-text-o" />
              <span className="mx-1">{researchPlan.name}</span>
            </span>
          </OverlayTrigger>
          <ShowUserLabels element={researchPlan} />
          <ElementCollectionLabels element={researchPlan} placement="right" />
          <HeaderCommentSection element={researchPlan} />
        </div>
        <div className="d-flex align-items-center gap-1 flex-row-reverse">
          <ConfirmClose el={researchPlan} />
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="saveresearch_plan">Save Research Plan</Tooltip>}>
            <Button
              variant="warning"
              size="xxsm"
              onClick={() => this.handleSubmit()}
              style={{ display: (researchPlan.changed || false) ? '' : 'none' }}
            >
              <i className="fa fa-floppy-o" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
          {!researchPlan.isNew
            && <OpenCalendarButton isPanelHeader eventableId={researchPlan.id} eventableType="ResearchPlan" />}
          {copyBtn}
        </div>
      </div>
    );
  }

  renderPanelFooter() {
    const { researchPlan } = this.state;

    return (
      <>
        <Button
          variant="primary"
          onClick={() => DetailActions.close(researchPlan)}
        >
          Close
        </Button>
        {(researchPlan.changed || researchPlan.is_copy) && (
          <Button variant="warning" onClick={() => this.handleSubmit()}>
            {researchPlan.isNew ? 'Create' : 'Save'}
          </Button>
        )}
      </>
    );
  }

  render() {
    const { researchPlan, visible } = this.state;

    const tabContentsMap = {
      research_plan: (
        <Tab eventKey="research_plan" title="Research plan" key={`rp_${researchPlan.id}`}>
          {
            !researchPlan.isNew && <CommentSection section="research_plan_research_plan" element={researchPlan} />
          }
          {this.renderResearchPlanMain(researchPlan)}
          <EditUserLabels
            element={researchPlan}
            fnCb={this.handleResearchPlanChange}
          />
          <PrivateNoteElement element={researchPlan} disabled={researchPlan.can_update} />
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${researchPlan.id}`}>
          {
            !researchPlan.isNew && <CommentSection section="research_plan_analyses" element={researchPlan} />
          }
          {this.renderAnalysesTab(researchPlan)}
        </Tab>
      ),
      attachments: (
        <Tab eventKey="attachments" title="Attachments" key={`attachments_${researchPlan.id}`}>
          {
            !researchPlan.isNew && <CommentSection section="research_plan_attachments" element={researchPlan} />
          }
          {this.renderAttachmentsTab(researchPlan)}
        </Tab>
      ),
      references: (
        <Tab eventKey="references" title="References" key={`lit_${researchPlan.id}`}>
          {
            !researchPlan.isNew && <CommentSection section="research_plan_references" element={researchPlan} />
          }
          <DetailsTabLiteratures element={researchPlan} />
        </Tab>
      ),
      wellplates: (
        <Tab eventKey="wellplates" title="Wellplates" key={`wellplates_${researchPlan.id}`}>
          <ResearchPlanWellplates
            researchPlan={researchPlan}
            wellplates={researchPlan.wellplates}
            dropWellplate={(wellplate) => this.dropWellplate(wellplate)}
            deleteWellplate={(wellplate) => this.deleteWellplate(wellplate)}
            importWellplate={(wellplate) => this.importWellplate(wellplate)}
          />
        </Tab>
      ),
      metadata: (
        <Tab eventKey="metadata" title="Metadata" disabled={researchPlan.isNew} key={`metadata_${researchPlan.id}`}>
          {
            !researchPlan.isNew && <CommentSection section="research_plan_metadata" element={researchPlan} />
          }
          <ResearchPlanMetadata researchPlan={researchPlan} />
        </Tab>
      ),
      history: (
        <Tab
          eventKey="history"
          title="History"
          key={`Versions_ResearchPlan_${researchPlan.id.toString()}`}
        >
          <VersionsTable
            type="research_plans"
            id={researchPlan.id}
            element={researchPlan}
            parent={this}
            isEdited={researchPlan.changed}
          />
        </Tab>
      ),
    };

    addSegmentTabs(researchPlan, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });
    // eslint-disable-next-line react/destructuring-assignment
    const activeTab = (this.state.activeTab !== 0 && this.state.activeTab) || visible[0];

    return (
      <DetailCard
        isPendingToSave={researchPlan.isPendingToSave}
        header={this.renderPanelHeading(researchPlan)}
        footer={this.renderPanelFooter()}
      >
        <div className="tabs-container--with-borders">
          <ElementDetailSortTab
            type="research_plan"
            availableTabs={Object.keys(tabContentsMap)}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          <Tabs
            mountOnEnter
            unmountOnExit
            activeKey={activeTab}
            onSelect={(key) => this.handleSelect(key)}
            id="screen-detail-tab"
          >
            {tabContents}
          </Tabs>
        </div>
        <CommentModal element={researchPlan} />
      </DetailCard>
    );
  }
}

ResearchPlanDetails.propTypes = {
  researchPlan: PropTypes.instanceOf(ResearchPlan).isRequired,
};
