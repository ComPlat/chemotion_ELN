/* eslint-disable react/sort-comp */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/require-default-props */
import React, { Component } from 'react';
import Aviator from 'aviator';
import PropTypes from 'prop-types';
import {
  Button, Tabs, Tab, OverlayTrigger, Tooltip, ButtonToolbar, ButtonGroup
} from 'react-bootstrap';
import { findIndex, isEmpty } from 'lodash';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementResearchPlanLabels from 'src/apps/mydb/elements/labels/ElementResearchPlanLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import ReactionVariations from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';
import {
  REACTION_VARIATIONS_TAB_KEY
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ReactionDetailsContainers from 'src/apps/mydb/elements/details/reactions/analysesTab/ReactionDetailsContainers';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
// eslint-disable-next-line max-len
import ReactionDetailsProperties from 'src/apps/mydb/elements/details/reactions/propertiesTab/ReactionDetailsProperties';
import GreenChemistry from 'src/apps/mydb/elements/details/reactions/greenChemistryTab/GreenChemistry';
import Utils from 'src/utilities/Functions';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import { setReactionByType } from 'src/apps/mydb/elements/details/reactions/ReactionDetailsShare';
import { sampleShowOrNew } from 'src/utilities/routesUtils';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import ConfirmClose from 'src/components/common/ConfirmClose';
import { rfValueFormat } from 'src/utilities/ElementUtils';
import ExportSamplesButton from 'src/apps/mydb/elements/details/ExportSamplesButton';
import CopyElementModal from 'src/components/common/CopyElementModal';
import { permitOn } from 'src/components/common/uis';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import Immutable from 'immutable';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import ScifinderSearch from 'src/components/scifinder/ScifinderSearch';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import MatrixCheck from 'src/components/common/MatrixCheck';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import { ShowUserLabels } from 'src/components/UserLabels';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import ReactionSchemeGraphic from 'src/apps/mydb/elements/details/reactions/ReactionSchemeGraphic';

const handleProductClick = (product) => {
  const uri = Aviator.getCurrentURI();
  const uriArray = uri.split(/\//);
  Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/sample/${product.id}`, { silent: true });
  sampleShowOrNew({ params: { sampleID: product.id } });
};

const productLink = (product, active) => (
  <span>
    {active && "Sample Analysis:"}
    <span
      aria-hidden="true"
      className="pseudo-link"
      onClick={() => handleProductClick(product)}
      title="Open sample window"
    >
      <i className="icon-sample mx-1" />
      {product.title()}
    </span>
  </span>
);

export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);

    const { reaction } = props;
    this.state = {
      reaction,
      activeTab: UIStore.getState().reaction.activeTab,
      activeAnalysisTab: UIStore.getState().reaction.activeAnalysisTab,
      visible: Immutable.List(),
      sfn: UIStore.getState().hasSfn,
      currentUser: (UserStore.getState() && UserStore.getState().currentUser) || {},
    };

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.handleReactionChange = this.handleReactionChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    this.handleGaseousChange = this.handleGaseousChange.bind(this);
    if (!reaction.reaction_svg_file) {
      this.updateGraphic();
    }
  }

  componentDidMount() {
    const { reaction } = this.props;
    const { currentUser } = this.state;

    UIStore.listen(this.onUIStoreChange);
    setTimeout(() => {
      GasPhaseReactionActions.gaseousReaction(reaction.gaseous);
    }, 0);

    if (MatrixCheck(currentUser.matrix, commentActivation) && !reaction.isNew) {
      CommentActions.fetchComments(reaction);
    }
  }

  componentDidUpdate(prevProps) {
    const { reaction } = this.props;
    if (reaction !== prevProps.reaction) {
      this.setState({ reaction });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const reactionFromNextProps = nextProps.reaction;
    const reactionFromNextState = nextState.reaction;
    const nextActiveTab = nextState.activeTab;
    const nextActiveAnalysisTab = nextState.activeAnalysisTab;
    const nextVisible = nextState.visible;
    const {
      reaction: reactionFromCurrentState, activeTab, visible, activeAnalysisTab
    } = this.state;
    return (
      reactionFromNextProps.id !== reactionFromCurrentState.id
      || reactionFromNextProps.updated_at !== reactionFromCurrentState.updated_at
      || reactionFromNextProps.reaction_svg_file !== reactionFromCurrentState.reaction_svg_file
      || !!reactionFromNextProps.changed || !!reactionFromNextProps.editedSample
      || nextActiveTab !== activeTab || nextVisible !== visible
      || nextActiveAnalysisTab !== activeAnalysisTab
      || reactionFromNextState !== reactionFromCurrentState
    );
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  handleSubmit(closeView = false) {
    LoadingActions.start();

    const { reaction } = this.state;
    if (reaction && reaction.isNew) {
      ElementActions.createReaction(reaction);
    } else {
      ElementActions.updateReaction(reaction, closeView);
    }

    if (reaction.is_new || closeView) {
      DetailActions.close(reaction, true);
    }
  }

  handleReactionChange(reaction, options = {}) {
    reaction.updateMaxAmountOfProducts();
    reaction.changed = true;
    if (options.updateGraphic) {
      this.setState({ reaction }, () => this.updateGraphic());
    } else {
      this.setState({ reaction });
    }
  }

  handleInputChange(type, event) {
    let value;
    if (
      type === 'temperatureUnit'
      || type === 'temperatureData'
      || type === 'description'
      || type === 'role'
      || type === 'observation'
      || type === 'durationUnit'
      || type === 'duration'
      || type === 'rxno'
      || type === 'vesselSizeAmount'
      || type === 'vesselSizeUnit'
      || type === 'gaseous'
      || type === 'conditions'
      || type === 'volume'
      || type === 'useReactionVolumeForConcentration'
    ) {
      value = event;
    } else if (type === 'rfValue') {
      value = rfValueFormat(event.target.value) || '';
    } else {
      value = event.target.value;
    }

    const { reaction } = this.state;

    const { newReaction, options } = setReactionByType(reaction, type, value);
    this.handleReactionChange(newReaction, options);
  }

  handleProductChange(product, cb) {
    const { reaction } = this.state;

    reaction.updateMaterial(product);
    reaction.changed = true;

    this.setState({ reaction }, cb);
  }

  handleSelect = (key) => {
    UIActions.selectTab({ tabKey: key, type: 'reaction' });
    this.setState({
      activeTab: key
    });
  };

  handleSelectActiveAnalysisTab = (key) => {
    UIActions.selectActiveAnalysisTab(key);
    this.setState({
      activeAnalysisTab: key
    });
  };

  handleSegmentsChange(se) {
    const { reaction } = this.state;
    const { segments } = reaction;
    const idx = findIndex(segments, (o) => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    reaction.segments = segments;
    reaction.changed = true;
    this.setState({ reaction });
  }

  onUIStoreChange(state) {
    const { activeTab } = this.state;
    const { activeAnalysisTab } = this.state;
    if (state.reaction.activeTab !== activeTab
      || state.reaction.activeAnalysisTab !== activeAnalysisTab) {
      this.setState({
        activeTab: state.reaction.activeTab,
        activeAnalysisTab: state.reaction.activeAnalysisTab
      });
    }
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  reactionIsValid() {
    const { reaction } = this.state;
    return reaction.hasMaterials() && reaction.SMGroupValid();
  }

  productData(reaction) {
    const { products } = reaction;
    const { activeAnalysisTab } = this.state;

    const tabs = products.map((product, key) => {
      const activeTab = key.toString() === activeAnalysisTab;
      const title = productLink(product, activeTab);
      const setState = () => this.handleProductChange(product);
      const handleSampleChanged = (_, cb) => this.handleProductChange(product, cb);

      return (
        <Tab
          key={product.id}
          eventKey={key}
          title={title}
        >
          <SampleDetailsContainers
            sample={product}
            setState={setState}
            handleSampleChanged={handleSampleChanged}
            handleSubmit={this.handleSubmit}
          />
        </Tab>
      );
    });
    const reactionTab = (
      <span>
        {activeAnalysisTab === '4.1' && 'Reaction Analysis:'}
        <i className="icon-reaction mx-1" />
        {reaction.short_label}
      </span>
    );
    return (
      <div className="tabs-container--with-borders">
        <Tabs
          id="data-detail-tab"
          unmountOnExit
          activeKey={activeAnalysisTab}
          // eslint-disable-next-line react/jsx-no-bind
          onSelect={this.handleSelectActiveAnalysisTab.bind(this)}
        >
          {tabs}
          <Tab eventKey={4.1} title={reactionTab}>
            <ReactionDetailsContainers
              reaction={reaction}
              readOnly={!permitOn(reaction)}
              handleSubmit={this.handleSubmit}
              handleReactionChange={this.handleReactionChange}
            />
          </Tab>
        </Tabs>
      </div>
    );
  }

  reactionHeader(reaction) {
    const hasChanged = reaction.changed ? '' : 'none';
    const titleTooltip = formatTimeStampsOfElement(reaction || {});

    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;

    const copyBtn = (reaction.can_copy === true && !reaction.isNew) && (
      <CopyElementModal
        element={reaction}
        defCol={defCol}
      />
    );

    const colLabel = !reaction.isNew && (
      <ElementCollectionLabels element={reaction} key={reaction.id} placement="right" />
    );

    const rsPlanLabel = (reaction.isNew || isEmpty(reaction.research_plans)) ? null : (
      <ElementResearchPlanLabels plans={reaction.research_plans} key={reaction.id} placement="right" />
    );

    return (
      <div className="d-flex justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="sampleDates">{titleTooltip}</Tooltip>}>
            <span>
              <i className="icon-reaction me-1" />
              {reaction.title()}
            </span>
          </OverlayTrigger>
          {colLabel}
          {rsPlanLabel}
          <ShowUserLabels element={reaction} />
          <ElementAnalysesLabels element={reaction} key={`${reaction.id}_analyses`} />
          <HeaderCommentSection element={reaction} />
        </div>
        <div className="d-flex align-items-center gap-1">
          <ButtonToolbar className="gap-1 justify-content-end">
            <PrintCodeButton element={reaction} />
            {!reaction.isNew
              && <OpenCalendarButton isPanelHeader eventableId={reaction.id} eventableType="Reaction" />}
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="generateReport">Generate Report</Tooltip>}
            >
              <Button
                variant="success"
                size="xxsm"
                disabled={reaction.changed || reaction.isNew}
                title={(reaction.changed || reaction.isNew)
                  ? 'Report can be generated after reaction is saved.'
                  : 'Generate report for this reaction'}
                onClick={() => Utils.downloadFile({
                  contents: `/api/v1/reports/docx?id=${reaction.id}`,
                  name: reaction.name
                })}
              >
                <i className="fa fa-cogs" />
              </Button>
            </OverlayTrigger>
            {reaction.changed
              && (
                <>
                  <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip id="saveReaction">Save and Close Reaction</Tooltip>}
                  >
                    <Button
                      variant="warning"
                      size="xxsm"
                      onClick={() => this.handleSubmit(true)}
                      disabled={!permitOn(reaction) || !this.reactionIsValid() || reaction.isNew}
                    >
                      <i className="fa fa-floppy-o me-1" />
                      <i className="fa fa-times" />
                    </Button>
                  </OverlayTrigger>
                  <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip id="saveReaction">Save Reaction</Tooltip>}
                  >
                    <Button
                      variant="warning"
                      size="xxsm"
                      onClick={() => this.handleSubmit()}
                      disabled={!permitOn(reaction) || !this.reactionIsValid()}
                    >
                      <i className="fa fa-floppy-o " />
                    </Button>
                  </OverlayTrigger>
                </>
              )}
            {copyBtn}
            <ConfirmClose el={reaction} />
          </ButtonToolbar>
        </div>
      </div>
    );
  }

  reactionFooter() {
    const { reaction } = this.state;
    const submitLabel = (reaction && reaction.isNew) ? 'Create' : 'Save';

    return (
      <>
        <Button variant="primary" onClick={() => DetailActions.close(reaction)}>
          Close
        </Button>
        <Button
          id="submit-reaction-btn"
          variant="warning"
          onClick={() => this.handleSubmit()}
          disabled={!permitOn(reaction) || !this.reactionIsValid()}
        >
          {submitLabel}
        </Button>
        {reaction && !reaction.isNew && (
          <ExportSamplesButton type="reaction" id={reaction.id} />
        )}
      </>
    );
  }

  updateGraphic() {
    const { reaction } = this.state;
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map((material) => material.svgPath),
      reactants: reaction.reactants.map((material) => material.svgPath),
      products: reaction.products.map((material) => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter((s) => s);

    let temperature = reaction.temperature_display;
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = `${temperature} ${reaction.temperature.valueUnit}`;
    }

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(
      materialsSvgPaths,
      temperature,
      solvents,
      reaction.duration,
      reaction.conditions
    ).then((result) => {
      if (result.reaction_svg !== reaction.reaction_svg_file) {
        reaction.reaction_svg_file = result.reaction_svg;
        this.handleReactionChange(reaction, { updateGraphic: true });
      }
    });
  }

  handleGaseousChange() {
    const { reaction } = this.state;
    this.handleInputChange('gaseous', !reaction.gaseous);
  }

  // eslint-disable-next-line class-methods-use-this
  updateReactionVesselSize(reaction) {
    Promise.resolve().then(() => {
      const { catalystMoles, vesselSize } = reaction.findReactionVesselSizeCatalystMaterialValues();

      if (vesselSize) {
        GasPhaseReactionActions.setReactionVesselSize(vesselSize);
      }

      if (catalystMoles) {
        GasPhaseReactionActions.setCatalystReferenceMole(catalystMoles);
      }

      if (!vesselSize) {
        GasPhaseReactionActions.setReactionVesselSize(null);
      }

      if (!catalystMoles) {
        GasPhaseReactionActions.setCatalystReferenceMole(null);
      }
    });
  }

  render() {
    const { reaction, visible, activeTab } = this.state;
    this.updateReactionVesselSize(reaction);
    const tabContentsMap = {
      scheme: (
        <Tab eventKey="scheme" title="Scheme" key={`scheme_${reaction.id}`}>
          <ButtonGroup>
            <ButtonGroupToggleButton
              active={!reaction.gaseous}
              onClick={this.handleGaseousChange}
            >
              Default Scheme
            </ButtonGroupToggleButton>
            <ButtonGroupToggleButton
              active={reaction.gaseous}
              onClick={this.handleGaseousChange}
            >
              Gas Scheme
            </ButtonGroupToggleButton>
          </ButtonGroup>
          {
            !reaction.isNew && <CommentSection section="reaction_scheme" element={reaction} />
          }
          <ReactionDetailsScheme
            reaction={reaction}
            onReactionChange={(r, options) => this.handleReactionChange(r, options)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
          />
        </Tab>
      ),
      properties: (
        <Tab eventKey="properties" title="Properties" key={`properties_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_properties" element={reaction} />
          }
          <ReactionDetailsProperties
            reaction={reaction}
            onReactionChange={(r) => this.handleReactionChange(r)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
            key={reaction.checksum}
          />
        </Tab>
      ),
      references: (
        <Tab eventKey="references" title="References" key={`references_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_references" element={reaction} />
          }
          <DetailsTabLiteratures
            element={reaction}
            literatures={reaction.isNew ? reaction.literatures : null}
            onElementChange={(r) => this.handleReactionChange(r)}
          />
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_analyses" element={reaction} />
          }
          {this.productData(reaction)}
        </Tab>
      ),
      green_chemistry: (
        <Tab eventKey="green_chemistry" title="Green Chemistry" key={`green_chem_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_green_chemistry" element={reaction} />
          }
          <GreenChemistry
            reaction={reaction}
            onReactionChange={this.handleReactionChange}
          />
        </Tab>
      ),
      variations: (
        <Tab
          eventKey={REACTION_VARIATIONS_TAB_KEY}
          title="Variations"
          key={`variations_${reaction.id}`}
          unmountOnExit={false}
        >
          <ReactionVariations
            reaction={reaction}
            onReactionChange={this.handleReactionChange}
            isActive={activeTab === REACTION_VARIATIONS_TAB_KEY}
          />
        </Tab>
      ),
      history: (
        <Tab
          eventKey="history"
          title="History"
          key={`Versions_Reaction_${reaction.id.toString()}`}
        >
          <VersionsTable
            type="reactions"
            id={reaction.id}
            element={reaction}
            parent={this}
            isEdited={reaction.changed}
          />
        </Tab>
      ),
    };

    addSegmentTabs(reaction, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });

    const currentTab = (activeTab !== 0 && activeTab) || visible[0];

    return (
      <DetailCard
        isPendingToSave={reaction.isPendingToSave}
        header={this.reactionHeader(reaction)}
        footer={this.reactionFooter()}
      >
        <ReactionSchemeGraphic
          reaction={reaction}
          onToggleLabel={(materialId) => {
            reaction.toggleShowLabelForSample(materialId);
            this.handleReactionChange(reaction, { updateGraphic: true });
          }}
        />
        {this.state.sfn && <ScifinderSearch el={reaction} />}
        <div className="tabs-container--with-borders">
          <ElementDetailSortTab
            type="reaction"
            availableTabs={Object.keys(tabContentsMap)}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          <Tabs
            mountOnEnter
            activeKey={currentTab}
            onSelect={this.handleSelect}
            id="reaction-detail-tab"
            unmountOnExit
          >
            {tabContents}
          </Tabs>
          <CommentModal element={reaction} />
        </div>
      </DetailCard>
    );
  }
}

ReactionDetails.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  reaction: PropTypes.object,
};
