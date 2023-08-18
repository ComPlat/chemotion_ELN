import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel, ListGroup, ListGroupItem, ButtonToolbar, Button, Tooltip, OverlayTrigger, Tabs, Tab, Dropdown, MenuItem, ButtonGroup
} from 'react-bootstrap';
import { unionBy, findIndex } from 'lodash';
import Immutable from 'immutable';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import ResearchPlansLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ResearchPlanWellplates from 'src/apps/mydb/elements/details/researchPlans/wellplatesTab/ResearchPlanWellplates';
import ResearchPlanMetadata from 'src/apps/mydb/elements/details/researchPlans/ResearchPlanMetadata';
import Attachment from 'src/models/Attachment';
import Utils from 'src/utilities/Functions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ConfirmClose from 'src/components/common/ConfirmClose';
import ResearchPlan from 'src/models/ResearchPlan';
import ResearchPlanDetailsAttachments from 'src/apps/mydb/elements/details/researchPlans/attachmentsTab/ResearchPlanDetailsAttachments';
import ResearchPlanDetailsBody from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsBody';
import ResearchPlanDetailsName from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsName';
import ResearchPlanDetailsContainers from 'src/apps/mydb/elements/details/researchPlans/analysesTab/ResearchPlanDetailsContainers';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

export default class ResearchPlanDetails extends Component {
  constructor(props) {
    super(props);
    const { researchPlan } = props;
    this.state = {
      researchPlan,
      update: false,
      visible: Immutable.List(),
    };
    this.handleSwitchMode = this.handleSwitchMode.bind(this);
    this.handleResearchPlanChange = this.handleResearchPlanChange.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleBodyChange = this.handleBodyChange.bind(this);
    this.handleBodyAdd = this.handleBodyAdd.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
  }

  componentDidMount() {
    const { researchPlan } = this.props;
    CommentActions.fetchComments(researchPlan);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { researchPlan } = nextProps;
    this.setState({ researchPlan });
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  toggleFullScreen() {
    this.props.toggleFullScreen();

    // toogle update prop to notify react data grid for view change
    this.setState({ update: !this.state.update });
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

  handleBodyDelete(id, attachments) {
    const { researchPlan } = this.state;
    researchPlan.removeFieldFromBody(id);
    this.setState({ researchPlan });
  }

  // handle attachment actions

  handleAttachmentDrop(files) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    files.forEach((file) => {
      const attachment = Attachment.fromFile(file);
      researchPlan.attachments.push(attachment);
    });
    this.setState({ researchPlan });
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

  handleAttachmentDownload(attachment) { // eslint-disable-line class-methods-use-this
    Utils.downloadFile({ contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename });
  }

  handleAttachmentEdit(attachment) {
    const { researchPlan } = this.state;
    researchPlan.changed = true;
    // update only this attachment
    researchPlan.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) return attachment;
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
        alert(result.error);
      }
    });
  }

  handleAttachmentImportComplete() {
    this.setState({ activeTab: 0 });
  }
  // render functions

  renderExportButton(disabled) {
    return (
      <Dropdown
        id="research-plan-export-dropdown"
        className="research-plan-export-dropdown dropdown-right pull-right"
        disabled={disabled}
      >
        <Dropdown.Toggle>
          Export
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItem onSelect={() => this.handleExport('docx')}>
            as .docx
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('odt')}>
            as .odt
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('html')}>
            as HTML
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('markdown')}>
            as Markdown
          </MenuItem>
          <MenuItem onSelect={() => this.handleExport('latex')}>
            as LaTeX
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  renderResearchPlanMain(researchPlan, update) { /* eslint-disable react/jsx-no-bind */
    const {
      name, body, changed, attachments
    } = researchPlan;
    const edit = researchPlan.mode === 'edit';

    const editTooltip = (<Tooltip id="edit-tooltip">Click to switch to edit mode</Tooltip>);
    const viewTooltip = (<Tooltip id="view-tooltip">Click to switch to view mode</Tooltip>);

    const EditButton = (
      <Button
        bsSize="middle"
        bsStyle={researchPlan.mode === 'edit' ? 'warning' : 'default'}
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
        bsSize="middle"
        bsStyle={researchPlan.mode === 'view' ? 'info' : 'default'}
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
        style={{ cursor: 'pointer' }}
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
      <ListGroup fill="true">
        <ListGroupItem>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <ResearchPlanDetailsName
                value={name}
                disabled={researchPlan.isMethodDisabled('name')}
                onChange={this.handleNameChange}
                edit={edit}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
              <div style={{ marginRight: '5px', marginLeft: '5px' }}>
                {btnMode}
              </div>
              {this.renderExportButton(changed)}
            </div>
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
            update={update}
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
        </ListGroupItem>
      </ListGroup>
    );
  } /* eslint-enable */

  renderAnalysesTab(researchPlan) {
    return (
      <ListGroup fill="true">
        <ListGroupItem>
          <ResearchPlanDetailsContainers
            handleSubmit={this.handleSubmit}
            researchPlan={researchPlan}
            readOnly={false}
            parent={this}
          />
        </ListGroupItem>
      </ListGroup>
    );
  }

  renderAttachmentsTab(researchPlan) { /* eslint-disable react/jsx-no-bind */
    return (
      <ListGroup fill="true">
        <ListGroupItem>
          <ResearchPlanDetailsAttachments
            researchPlan={researchPlan}
            attachments={researchPlan.attachments}
            onDrop={this.handleAttachmentDrop.bind(this)}
            onDelete={this.handleAttachmentDelete.bind(this)}
            onUndoDelete={this.handleAttachmentUndoDelete.bind(this)}
            onDownload={this.handleAttachmentDownload.bind(this)}
            onAttachmentImportComplete={this.handleAttachmentImportComplete.bind(this)}
            onEdit={this.handleAttachmentEdit.bind(this)}
            readOnly={false}
          />
        </ListGroupItem>
      </ListGroup>
    );
  } /* eslint-enable */

  renderPanelHeading(researchPlan) {
    const titleTooltip = formatTimeStampsOfElement(researchPlan || {});

    return (
      <Panel.Heading>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="rpDates">{titleTooltip}</Tooltip>}>
          <span>
            <i className="fa fa-file-text-o" />
            &nbsp;
            {' '}
            <span>{researchPlan.name}</span>
            {' '}
            &nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={researchPlan} placement="right" />
        <HeaderCommentSection element={researchPlan} />
        <ConfirmClose el={researchPlan} />
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="saveresearch_plan">Save Research Plan</Tooltip>}>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.handleSubmit()}
            style={{ display: (researchPlan.changed || false) ? '' : 'none' }}
          >
            <i className="fa fa-floppy-o" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullSample">Fullresearch_plan</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={this.toggleFullScreen}>
            <i className="fa fa-expand" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        {researchPlan.isNew
          ? null
          : <OpenCalendarButton isPanelHeader eventableId={researchPlan.id} eventableType="ResearchPlan" />}
      </Panel.Heading>
    );
  }

  render() {
    const { researchPlan, update, visible } = this.state;

    let btnMode = <Button bsSize="xs" bsStyle="success" disabled={!researchPlan.can_update} onClick={() => this.handleSwitchMode('edit')}>
                    click to edit
                  </Button>;
    if (researchPlan.mode !== 'view') {
      btnMode = <Button bsSize="xs" bsStyle="info" onClick={() => this.handleSwitchMode('view')}>click to view</Button>;
    }

    const tabContentsMap = {
      research_plan: (
        <Tab eventKey="research_plan" title="Research plan" key={`rp_${researchPlan.id}`}>
          {
            !researchPlan.isNew && <CommentSection section="research_plan_research_plan" element={researchPlan} />
          }
          {this.renderResearchPlanMain(researchPlan, update)}
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
          <ResearchPlansLiteratures element={researchPlan} />
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
          <ResearchPlanMetadata
            parentResearchPlan={researchPlan}
            parentResearchPlanMetadata={researchPlan.research_plan_metadata}
          />
        </Tab>
      ),
    };

    const tabTitlesMap = {
      research_plan: 'Research Plan',
      analyses: 'Analyses',
      attachments: 'Attachments',
      wellplates: 'Wellplates',
      references: 'References',
      metadata: 'Metadata',
    };
    addSegmentTabs(researchPlan, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });
    const activeTab = (this.state.activeTab !== 0 && this.state.activeTab) || visible[0];

    return (
      <Panel
        bsStyle={researchPlan.isPendingToSave ? 'info' : 'primary'}
        className="eln-panel-detail research-plan-details"
      >
        {this.renderPanelHeading(researchPlan)}
        <Panel.Body>
          <ElementDetailSortTab
            type="research_plan"
            availableTabs={Object.keys(tabContentsMap)}
            tabTitles={tabTitlesMap}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          <Tabs activeKey={activeTab} onSelect={(key) => this.handleSelect(key)} id="screen-detail-tab">
            {tabContents}
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(researchPlan)}>Close</Button>
            {
              researchPlan.changed ? (
                <Button bsStyle="warning" onClick={() => this.handleSubmit()}>
                  {researchPlan.isNew ? 'Create' : 'Save'}
                </Button>
              ) : <div />
            }
          </ButtonToolbar>
          <CommentModal element={researchPlan} />
        </Panel.Body>
      </Panel>
    );
  }
}

ResearchPlanDetails.propTypes = {
  researchPlan: PropTypes.instanceOf(ResearchPlan).isRequired,
  toggleFullScreen: PropTypes.func.isRequired,
};
