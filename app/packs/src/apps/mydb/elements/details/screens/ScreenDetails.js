import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, ControlLabel, FormControl, Panel, ListGroup, ListGroupItem,
  ButtonToolbar, Button, Tooltip, OverlayTrigger, Tabs, Tab
} from 'react-bootstrap';
import { unionBy, findIndex } from 'lodash';
import Immutable from 'immutable';

import ConfirmClose from 'src/components/common/ConfirmClose';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import QuillEditor from 'src/components/QuillEditor';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import Screen from 'src/models/Screen';
import ScreenDetailsContainers from 'src/apps/mydb/elements/details/screens/analysesTab/ScreenDetailsContainers';
import ScreenResearchPlans from 'src/apps/mydb/elements/details/screens/researchPlansTab/ScreenResearchPlans';
import ScreenWellplates from 'src/apps/mydb/elements/details/screens/ScreenWellplates';
import ResearchplanFlowDisplay from 'src/apps/mydb/elements/details/screens/ResearchplanFlowDisplay';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

export default class ScreenDetails extends Component {
  constructor(props) {
    super(props);
    const { screen } = props;
    this.state = {
      screen,
      activeTab: UIStore.getState().screen.activeTab,
      visible: Immutable.List(),
      expandedResearchPlanId: null,
    };
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    this.updateComponentGraphData = this.updateComponentGraphData.bind(this);
  }

  componentDidMount() {
    const { screen } = this.props;
    UIStore.listen(this.onUIStoreChange);
    CommentActions.fetchComments(screen);
  }

  componentWillReceiveProps(nextProps) {
    const { screen } = nextProps;
    this.setState({ screen });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { screen } = nextProps;
    this.setState({ screen });
  }

  onUIStoreChange(state) {
    if (state.screen.activeTab !== this.state.activeTab) {
      this.setState({
        activeTab: state.screen.activeTab
      });
    }
  }

  onUIStoreChange(state) {
    if (state.screen.activeTab != this.state.activeTab) {
      this.setState({
        activeTab: state.screen.activeTab
      });
    }
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  handleSubmit() {
    const { screen } = this.state;
    LoadingActions.start();

    if (screen.isNew) {
      ElementActions.createScreen(screen);
    } else {
      ElementActions.updateScreen(screen);
    }
    if (screen.is_new) {
      const force = true;
      DetailActions.close(screen, force);
    }
  }

  handleInputChange(type, event) {
    const types = ['name', 'requirements', 'collaborator', 'conditions', 'result', 'description'];
    if (types.indexOf(type) !== -1) {
      const { screen } = this.state;
      const { value } = event.target;

      screen[type] = value;
      this.setState({ screen });
    }
  }

  handleSegmentsChange(se) {
    const { screen } = this.state;
    const { segments } = screen;
    const idx = findIndex(segments, o => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    screen.segments = segments;
    screen.changed = true;
    this.setState({ screen });
  }

  handleScreenChanged(screen) {
    this.setState({ screen });
  }

  dropResearchPlan(researchPlan) {
    const { screen } = this.state;
    screen.research_plans = unionBy(screen.research_plans, [researchPlan], 'id');
    this.forceUpdate();
  }

  deleteResearchPlan(researchPlanID) {
    const { screen } = this.state;
    const researchPlanIndex = screen.research_plans.findIndex(rp => rp.id === researchPlanID);
    screen.research_plans.splice(researchPlanIndex, 1);

    this.setState({ screen });
  }

  updateResearchPlan(researchPlan) {
    const { screen } = this.state;
    const researchPlanIndex = screen.research_plans.findIndex(rp => rp.id === researchPlan.id);
    screen.research_plans[researchPlanIndex] = researchPlan;
  }

  saveResearchPlan(researchPlan) {
    const { screen } = this.state;
    LoadingActions.start();

    ResearchPlansFetcher.update(researchPlan)
      .then((result) => {
        const researchPlanIndex = screen.research_plans.findIndex(rp => rp.id === researchPlan.id);
        screen.research_plans[researchPlanIndex] = result;
        ElementActions.updateEmbeddedResearchPlan(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  dropWellplate(wellplate) {
    const { screen } = this.state;
    screen.wellplates = unionBy(screen.wellplates, [wellplate], 'id');
    this.forceUpdate();
  }

  deleteWellplate(wellplate) {
    const { screen } = this.state;
    const wellplateIndex = screen.wellplates.indexOf(wellplate);
    screen.wellplates.splice(wellplateIndex, 1);

    this.setState({ screen });
  }

  screenHeader(screen) {
    const saveBtnDisplay = screen.isEdited ? '' : 'none';
    const datetp = formatTimeStampsOfElement(screen || {});
    const { showCommentSection, comments } = this.props;

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="screenDatesx">{datetp}</Tooltip>}>
          <span>
            <i className="icon-screen" />
            &nbsp;<span>{screen.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={screen} placement="right" />
        <HeaderCommentSection element={screen} />
        <ConfirmClose el={screen} />
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="saveScreen">Save Screen</Tooltip>}
        >
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
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}
        >
          <Button
            bsStyle="info"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.props.toggleFullScreen()}
          >
            <i className="fa fa-expand" />
          </Button>
        </OverlayTrigger>
        {screen.isNew
          ? null
          : <OpenCalendarButton isPanelHeader eventableId={screen.id} eventableType="Screen" />}
        <PrintCodeButton element={screen} />
      </div>
    );
  }

  propertiesFields(screen) {
    const {
      wellplates, name, collaborator, result, conditions, requirements, description
    } = screen;

    return (
      <ListGroup fill="true">
        <ListGroupItem>
          <table width="100%">
            <tbody>
              <tr>
                <td width="50%" className="padding-right">
                  <FormGroup>
                    <ControlLabel>Name</ControlLabel>
                    <FormControl
                      type="text"
                      value={name || ''}
                      onChange={event => this.handleInputChange('name', event)}
                      disabled={screen.isMethodDisabled('name')}
                    />
                  </FormGroup>
                </td>
                <td width="50%">
                  <FormGroup>
                    <ControlLabel>Collaborator</ControlLabel>
                    <FormControl
                      type="text"
                      value={collaborator || ''}
                      onChange={event => this.handleInputChange('collaborator', event)}
                      disabled={screen.isMethodDisabled('collaborator')}
                    />
                  </FormGroup>
                </td>
              </tr>
              <tr>
                <td className="padding-right">
                  <FormGroup>
                    <ControlLabel>Requirements</ControlLabel>
                    <FormControl
                      type="text"
                      value={requirements || ''}
                      onChange={event => this.handleInputChange('requirements', event)}
                      disabled={screen.isMethodDisabled('requirements')}
                    />
                  </FormGroup>
                </td>
                <td >
                  <FormGroup>
                    <ControlLabel>Conditions</ControlLabel>
                    <FormControl
                      type="text"
                      value={conditions || ''}
                      onChange={event => this.handleInputChange('conditions', event)}
                      disabled={screen.isMethodDisabled('conditions')}
                    />
                  </FormGroup>
                </td>
              </tr>
              <tr>
                <td colSpan="2">
                  <FormGroup>
                    <ControlLabel>Result</ControlLabel>
                    <FormControl
                      type="text"
                      value={result || ''}
                      onChange={event => this.handleInputChange('result', event)}
                      disabled={screen.isMethodDisabled('result')}
                    />
                  </FormGroup>
                </td>
              </tr>
              <tr>
                <td colSpan="2">
                  <FormGroup>
                    <ControlLabel>Description</ControlLabel>
                    <QuillEditor
                      value={description}
                      onChange={event => this.handleInputChange('description', { target: { value: event } })}
                      disabled={screen.isMethodDisabled('description')}
                    />
                  </FormGroup>
                  <PrivateNoteElement element={screen} disabled={screen.can_update} />
                </td>
              </tr>
            </tbody>
          </table>
        </ListGroupItem>
        <ListGroupItem>
          <h4 className="list-group-item-heading">Wellplates</h4>
          <ScreenWellplates
            wellplates={wellplates}
            dropWellplate={wellplate => this.dropWellplate(wellplate)}
            deleteWellplate={wellplate => this.deleteWellplate(wellplate)}
          />
        </ListGroupItem>
      </ListGroup>
    );
  }

  handleSelect(eventKey) {
    UIActions.selectTab({ tabKey: eventKey, type: 'screen' });
    this.setState({
      activeTab: eventKey
    });
  }

  updateComponentGraphData(data) {
    const { screen } = this.state
    screen.componentGraphData = data;
    this.setState({ screen });
  }

  switchToResearchPlanTab() {
    if (this.state.activeTab == 'researchPlans') { return; }
    // call the pre-existing method to act as if a user had clicked on the research plans tab
    this.handleSelect('researchPlans');
  }

  expandResearchPlan(researchPlanId) {
    this.setState({ expandedResearchPlanId: researchPlanId });
  }

  scrollToResearchPlan(researchPlanId) {

  }


  render() {
    const { screen, visible } = this.state;
    const submitLabel = screen.isNew ? 'Create' : 'Save';

    const tabContentsMap = {
      properties: (
        <Tab eventKey="properties" title="Properties" key={`properties_${screen.id}`}>
          {
            !screen.isNew && <CommentSection section="screen_properties" element={screen} />
          }
          {this.propertiesFields(screen)}
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${screen.id}`}>
          {
            !screen.isNew && <CommentSection section="screen_analyses" element={screen} />
          }
          <ScreenDetailsContainers
            screen={screen}
            parent={this}
          />
        </Tab>
      ),
      research_plans: (
        <Tab eventKey="researchPlans" title="Research Plans" key={`research_plans_${screen.id}`}>
          <ScreenResearchPlans
            researchPlans={screen.research_plans}
            expandedResearchPlanId={this.state.expandedResearchPlanId}
            dropResearchPlan={researchPlan => this.dropResearchPlan(researchPlan)}
            deleteResearchPlan={researchPlan => this.deleteResearchPlan(researchPlan)}
            updateResearchPlan={researchPlan => this.updateResearchPlan(researchPlan)}
            saveResearchPlan={researchPlan => this.saveResearchPlan(researchPlan)}
          />
        </Tab>
      )
    };

    const tabTitlesMap = {
      properties: 'Properties',
      analyses: 'Analyses',
      research_plans: 'Research Plans',
    };

    addSegmentTabs(screen, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });

    const activeTab = (this.state.activeTab !== 0 && this.state.activeTab) || visible[0];

    const flowConfiguration = {
      preview: {
        onNodeDoubleClick: (_mouseEvent, node) => {
          const researchPlanId = parseInt(node.id)
          this.switchToResearchPlanTab()
          this.expandResearchPlan(researchPlanId)
          this.scrollToResearchPlan(researchPlanId)
        }
      },
      editor: {
        onSave: this.updateComponentGraphData
      }
    };

    return (
      <Panel
        bsStyle={screen.isPendingToSave ? 'info' : 'primary'}
        className="eln-panel-detail"
      >
        <Panel.Heading>{this.screenHeader(screen)}</Panel.Heading>
        <Panel.Body>
          <ResearchplanFlowDisplay
            initialData={screen.componentGraphData}
            researchplans={screen.research_plans}
            flowConfiguration={flowConfiguration}
          />
          <ElementDetailSortTab
            type="screen"
            availableTabs={Object.keys(tabContentsMap)}
            tabTitles={tabTitlesMap}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          <Tabs activeKey={activeTab} onSelect={key => this.handleSelect(key)} id="screen-detail-tab">
            {tabContents}
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(screen)}>Close</Button>
            <Button bsStyle="warning" disabled={!screen.can_update} onClick={() => this.handleSubmit()}>{submitLabel}</Button>
          </ButtonToolbar>
          <CommentModal element={screen} />
        </Panel.Body>
      </Panel>
    );
  }
}

ScreenDetails.propTypes = {
  screen: PropTypes.instanceOf(Screen).isRequired,
  toggleFullScreen: PropTypes.func.isRequired,
};
