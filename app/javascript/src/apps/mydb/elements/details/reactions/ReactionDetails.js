/* eslint-disable react/sort-comp */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/require-default-props */
import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tabs, Tab, OverlayTrigger, Tooltip, ButtonToolbar, Dropdown, Modal, Overlay
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
import { aviatorNavigation } from 'src/utilities/routesUtils';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
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
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import ReactionSchemeGraphic from 'src/apps/mydb/elements/details/reactions/ReactionSchemeGraphic';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';
import isEqual from 'lodash/isEqual';
import DocumentationButton from 'src/components/common/DocumentationButton';

const productLink = (product, active) => (
  <span>
    {active && "Sample Analysis:"}
    <span
      aria-hidden="true"
      className="pseudo-link"
      onClick={() => aviatorNavigation('sample', product.id, true, true)}
      title="Open sample window"
    >
      <i className="icon-sample mx-1" />
      {product.title()}
      hah
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
      reactionSvgVersion: 0, // Bumped when graphic is updated so shouldComponentUpdate sees a state change (we mutate reaction in place)
      isRefreshingGraphic: false,
    };

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.handleReactionChange = this.handleReactionChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    this.handleReactionSchemeChange = this.handleReactionSchemeChange.bind(this);
    this.openWtInfoModal = this.openWtInfoModal.bind(this);
    this.closeWtInfoModal = this.closeWtInfoModal.bind(this);
    this.confirmSchemeChange = this.confirmSchemeChange.bind(this);
    this.cancelSchemeChange = this.cancelSchemeChange.bind(this);
    this.state.showWtInfoModal = false;
    this.state.showSchemeChangeConfirm = false;
    this.state.pendingSchemeType = null;
    this.isUpdatingGraphic = false; // Flag to prevent infinite loops
    this.pendingGraphicReaction = null; // Queued reaction when update requested during in-flight fetch
    this.schemeDropdownRef = createRef();
    if (!reaction.reaction_svg_file) {
      this.updateGraphic();
    }
  }

  openWtInfoModal() {
    this.setState({ showWtInfoModal: true });
  }

  closeWtInfoModal() {
    this.setState({ showWtInfoModal: false });
  }

  componentDidMount() {
    const { reaction } = this.props;
    const { currentUser } = this.state;

    UIStore.listen(this.onUIStoreChange);
    setTimeout(() => {
      GasPhaseReactionActions.gaseousReaction(reaction.gaseous);
      // Initialize gas phase store with vessel size and catalyst values
      this.updateReactionVesselSize(reaction);
    }, 0);

    if (MatrixCheck(currentUser.matrix, commentActivation) && !reaction.isNew) {
      CommentActions.fetchComments(reaction);
    }

    // If opened in weight percentage mode, ensure store is synchronized on mount
    if (reaction && reaction.weight_percentage) {
      this.updateWeightPercentageReference(reaction);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { reaction } = this.props;

    // If props changed, update local state and then sync store if weight_percentage
    if (!isEqual(reaction, prevProps.reaction)) {
      // Same reaction (e.g. after save): keep current reaction_svg_file so SVG doesn't go white when server omits or delays it
      const isSameReaction = prevState.reaction?.id != null && reaction?.id === prevState.reaction.id;
      const prevSvg = prevState.reaction?.reaction_svg_file;
      const hasPrevSvg = prevSvg !== undefined && prevSvg !== null && String(prevSvg).trim() !== '';
      let stateUpdate = { reaction };
      if (isSameReaction && hasPrevSvg) {
        reaction.reaction_svg_file = prevSvg;
        stateUpdate = { reaction, reactionSvgVersion: (this.state.reactionSvgVersion || 0) + 1 };
      }
      this.setState(stateUpdate, () => {
        if (isSameReaction && hasPrevSvg) {
          this.forceUpdate(); // Ensure SVG re-renders after preserving (same reaction ref can skip shouldComponentUpdate)
        }
        if (this.state.reaction && this.state.reaction.weight_percentage) {
          this.updateWeightPercentageReference(this.state.reaction);
        }
        // Update gas phase store when reaction changes (e.g., loading new reaction)
        setTimeout(() => {
          this.updateReactionVesselSize(reaction);
        }, 0);
      });
      return;
    }

    // If the reaction stored in state toggled into weight_percentage, sync the store
    const prevReactionState = prevState && prevState.reaction;
    const currReactionState = this.state.reaction;
    if (
      currReactionState
      && currReactionState.weight_percentage
      && (!prevReactionState || !prevReactionState.weight_percentage)
    ) {
      this.updateWeightPercentageReference(currReactionState);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const reactionFromNextProps = nextProps.reaction;
    const reactionFromNextState = nextState.reaction;
    const nextActiveTab = nextState.activeTab;
    const nextActiveAnalysisTab = nextState.activeAnalysisTab;
    const nextVisible = nextState.visible;
    const nextShowSchemeChangeConfirm = nextState.showSchemeChangeConfirm;
    const nextShowWtInfoModal = nextState.showWtInfoModal;
    const nextReactionSvgVersion = nextState.reactionSvgVersion;
    const {
      reaction: reactionFromCurrentState, activeTab, visible, activeAnalysisTab,
      showSchemeChangeConfirm, showWtInfoModal, reactionSvgVersion
    } = this.state;
    return (
      reactionFromNextProps.id !== reactionFromCurrentState.id
      || reactionFromNextProps.updated_at !== reactionFromCurrentState.updated_at
      || reactionFromNextProps.reaction_svg_file !== reactionFromCurrentState.reaction_svg_file
      || !!reactionFromNextProps.changed || !!reactionFromNextProps.editedSample
      || nextActiveTab !== activeTab || nextVisible !== visible
      || nextActiveAnalysisTab !== activeAnalysisTab
      || reactionFromNextState !== reactionFromCurrentState
      || nextShowSchemeChangeConfirm !== showSchemeChangeConfirm
      || nextShowWtInfoModal !== showWtInfoModal
      || nextReactionSvgVersion !== reactionSvgVersion
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
    if (options.updateGraphic && !this.isUpdatingGraphic) {
      // Only call updateGraphic if we're not already updating to prevent infinite loops
      this.setState({ reaction }, () => this.updateGraphic());
    } else {
      // Just update state - ReactionSchemeGraphic will reload image automatically
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
      || type === 'weight_percentage'
      || type === 'default'
    ) {
      value = event;
    } else if (type === 'rfValue') {
      value = rfValueFormat(event.target.value) || '';
    } else {
      value = event.target.value;
    }

    const { reaction } = this.state;

    const { newReaction, options } = setReactionByType(reaction, type, value);

    // Update gas phase store synchronously for vessel size changes
    // to ensure store is updated before gas calculations run during render
    if (type === 'vesselSizeAmount' || type === 'vesselSizeUnit') {
      this.updateReactionVesselSize(newReaction);
    }
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
    const titleTooltip = formatTimeStampsOfElement(reaction || {});

    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.shared === false
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
            {(reaction.changed || reaction.isNew === true)
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

  refreshGraphic() {
    const { reaction, isRefreshingGraphic } = this.state;

    // Prevent multiple simultaneous refreshes
    if (isRefreshingGraphic) {
      return;
    }

    // Mark reaction as changed so save button is enabled when user clicks refresh
    reaction.changed = true;

    // Set loading state and enable save button
    this.setState({ reaction, isRefreshingGraphic: true }, () => {
      // Use requestAnimationFrame to ensure React has rendered before starting async operations
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Collect all materials with their molfile and svgPath
          const { reaction: currentReaction } = this.state;
          const allMaterials = [
            ...currentReaction.starting_materials,
            ...currentReaction.reactants,
            ...currentReaction.products,
          ].filter((material) => material.molfile && material.svgPath);

          if (allMaterials.length === 0) {
            // Keep loading state visible briefly so user sees feedback when there's nothing to refresh
            setTimeout(() => this.setState({ isRefreshingGraphic: false }), 400);
            return;
          }

          // Batch refresh all SVGs in a single API call
          SamplesFetcher.batchRefreshSvg(allMaterials)
            .then((results) => {
              // Log any failures for debugging
              const failures = results.filter((r) => !r.success);
              if (failures.length > 0) {
                console.warn('Some SVG refreshes failed:', failures);
              }
              // Re-render on response, then refresh the reaction scheme graphic
              this.setState((state) => ({ reaction: state.reaction }), () => this.updateGraphic());
            })
            .catch((error) => {
              console.error('Error batch refreshing material SVGs:', error);
              // Still try to update graphic even if batch refresh failed
              this.updateGraphic();
            })
            .finally(() => {
              // Reset loading state
              this.setState({ isRefreshingGraphic: false });
            });
        });
      });
    });
  }

  updateGraphic(reactionFromChange) {
    // Use reaction passed from handleReactionChange when available so we have the latest data (e.g. conditions)
    const reaction = reactionFromChange || this.state.reaction;

    // If a fetch is already in progress, queue this reaction to update again when it completes
    if (this.isUpdatingGraphic) {
      this.pendingGraphicReaction = reaction;
      return;
    }

    this.isUpdatingGraphic = true;
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
      if (result && result.reaction_svg && result.reaction_svg !== reaction.reaction_svg_file) {
        // Update reaction_svg_file and state - image will reload automatically via ReactionSchemeGraphic useEffect
        reaction.reaction_svg_file = result.reaction_svg;
        // Update state without calling updateGraphic again to prevent infinite loop
        this.setState({ reaction });
      }
    }).catch((error) => {
      console.error('Error updating reaction graphic:', error);
    }).finally(() => {
      this.isUpdatingGraphic = false;
      // If a condition/material change was requested while we were fetching, update with latest data
      if (this.pendingGraphicReaction) {
        const pending = this.pendingGraphicReaction;
        this.pendingGraphicReaction = null;
        this.updateGraphic(pending);
      }
    });
  }

  handleReactionSchemeChange(type) {
    const { reaction } = this.state;

    // If switching FROM weight_percentage to another scheme, show confirmation
    if (reaction.weight_percentage && type !== 'weight_percentage') {
      this.setState({
        showSchemeChangeConfirm: true,
        pendingSchemeType: type,
      });
      return;
    }

    this.applySchemeChange(type);
  }

  /**
   * Applies the scheme change without confirmation.
   * Called directly when not switching from weight_percentage, or after user confirms.
   *
   * @param {string} type - The scheme type to switch to ('default', 'gaseous', 'weight_percentage')
   */
  applySchemeChange(type) {
    const { reaction } = this.state;

    if (type === 'default') {
      // Reset weight_percentage_reference for all materials when leaving weight percentage mode
      this.resetWeightPercentagedependencies(reaction);
      // Recalculate equivalents for starting materials and reactants
      this.recalculateEquivalentsForMaterials(reaction);

      this.handleInputChange('weight_percentage', false);
      this.handleInputChange('gaseous', false);
    } else if (type === 'weight_percentage') {
      this.handleInputChange('weight_percentage', true);
      this.handleInputChange('gaseous', false);
      this.assignWeightPercentageReference(reaction);
    } else if (type === 'gaseous') {
      // Reset weight percentage data when switching to gaseous from weight_percentage
      this.resetWeightPercentagedependencies(reaction);
      this.recalculateEquivalentsForMaterials(reaction);

      this.handleInputChange('gaseous', true);
      this.handleInputChange('weight_percentage', false);
    }
  }

  /**
   * Confirms the pending scheme change and applies it.
   * Called when user clicks "Confirm" in the scheme change confirmation dialog.
   */
  confirmSchemeChange() {
    const { pendingSchemeType } = this.state;
    this.setState({
      showSchemeChangeConfirm: false,
      pendingSchemeType: null,
    }, () => {
      if (pendingSchemeType) {
        this.applySchemeChange(pendingSchemeType);
      }
    });
  }

  /**
   * Cancels the pending scheme change.
   * Called when user clicks "Discard" in the scheme change confirmation dialog.
   */
  cancelSchemeChange() {
    this.setState({
      showSchemeChangeConfirm: false,
      pendingSchemeType: null,
    });
  }

  /**
   * Resets weight_percentage_reference to false for all materials in the reaction.
   * Called when switching from weight percentage scheme to default or gaseous scheme.
   *
   * @param {Object} reaction - The reaction object containing materials
   */
  // eslint-disable-next-line class-methods-use-this
  resetWeightPercentagedependencies(reaction) {
    const allMaterials = [
      ...reaction.starting_materials,
      ...reaction.reactants,
      ...reaction.products,
      ...reaction.solvents,
    ];

    allMaterials.forEach((material) => {
      material.weight_percentage_reference = false;
      material.weight_percentage = null;
    });
    WeightPercentageReactionActions.setWeightPercentageReference(null);
    WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(null);
  }

  /**
   * Recalculates equivalent values for starting materials and reactants.
   * Uses the reference material's moles to compute each material's equivalent.
   *
   * Formula: equivalent = material.amount_mol / referenceMaterial.amount_mol
   *
   * @param {Object} reaction - The reaction object containing materials
   */
  // eslint-disable-next-line class-methods-use-this
  recalculateEquivalentsForMaterials(reaction) {
    const referenceMaterial = reaction.referenceMaterial;
    if (!referenceMaterial || !referenceMaterial.amount_mol) {
      return;
    }

    const materialsToUpdate = [
      ...reaction.starting_materials,
      ...reaction.reactants,
    ];

    materialsToUpdate.forEach((material) => {
      if (!material.reference && material.amount_mol) {
        material.equivalent = material.amount_mol / referenceMaterial.amount_mol;
      }
    });
  }

  /**
   * Assigns weight_percentage_reference of the first product to true for a reaction.
   * Called when switching from default or gaseous scheme to weight percentage scheme.
   *
   * @param {Object} reaction - The reaction object containing materials
   */
  // eslint-disable-next-line class-methods-use-this
  assignWeightPercentageReference(reaction) {
    if (reaction.products.length > 0) {
      reaction.products[0].weight_percentage_reference = true;
      WeightPercentageReactionActions.setWeightPercentageReference(reaction.products[0]);
      const amountValue = reaction.products[0].target_amount_value;
      const amountUnit = reaction.products[0].target_amount_unit;
      const targetAmount = { value: amountValue, unit: amountUnit };
      WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(targetAmount);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  updateReactionVesselSize(reaction) {
    if (!reaction) return;

    const { catalystMoles, vesselSize } = reaction.findReactionVesselSizeCatalystMaterialValues();

    // Avoid dispatch while another Alt dispatch is in progress.
    setTimeout(() => {
      if (vesselSize) {
        GasPhaseReactionActions.setReactionVesselSize(vesselSize);
      } else {
        GasPhaseReactionActions.setReactionVesselSize(null);
      }

      if (catalystMoles) {
        GasPhaseReactionActions.setCatalystReferenceMole(catalystMoles);
      } else {
        GasPhaseReactionActions.setCatalystReferenceMole(null);
      }
    }, 0);
  }

  /**
   * Updates the weight percentage reference material and target amount in the store.
   *
   * This method is called when the reaction is in weight percentage mode to synchronize
   * the Alt.js store with the current weight percentage reference material from the reaction.
   *
   * Workflow:
   * 1. Retrieves the current weight percentage reference material and target amount
   * 2. Dispatches actions to update the WeightPercentageReactionStore
   *
   * Store updates:
   * - setWeightPercentageReference: Updates which material is the weight percentage reference
   * - setTargetAmountWeightPercentageReference: Updates the target amount for calculations
   *
   * Note: Wrapped in Promise.resolve() to ensure async execution and avoid state conflicts
   *
   * @param {Object} reaction - The reaction object containing weight percentage reference data
   */
  // eslint-disable-next-line class-methods-use-this
  updateWeightPercentageReference(reaction) {
    if (!reaction) return;

    const { weightPercentageReference, targetAmount } = reaction.findWeightPercentageReferenceMaterial();
    if (!weightPercentageReference) return;

    // Ensure we don't dispatch while another Alt dispatch is in progress.
    setTimeout(() => {
      WeightPercentageReactionActions.setWeightPercentageReference(weightPercentageReference);
      WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(targetAmount);
    }, 0);
  }

  render() {
    const {
      reaction, visible, activeTab, showSchemeChangeConfirm
    } = this.state;
    this.updateReactionVesselSize(reaction);
    let schemeType = 'Default';
    let documentationLink;
    let documentComponent = null;
    if (reaction.gaseous) {
      schemeType = 'Gaseous';
      documentationLink = 'https://chemotion.net/docs/eln/ui/elements/reactions'
        + '?_highlight=weight&_highlight=p#gas-phase-reaction-scheme';
      documentComponent = (
        <DocumentationButton
          link={documentationLink}
          overlayMessage="Click to open link to the documentation of the gas phase feature"
          className="ms-3 flex-shrink-0"
        />
      );
    } else if (reaction.weight_percentage) {
      schemeType = 'Weight Percentage';
      documentationLink = 'https://chemotion.net/docs/eln/ui/elements/reactions'
        + '?_highlight=weight&_highlight=p#weight-percentage-reaction-scheme';
      documentComponent = (
        <DocumentationButton
          link={documentationLink}
          overlayMessage="Click to open link to the documentation of the weight percentage feature"
          className="ms-3 flex-shrink-0"
          omitDocumentationWord
        />
      );
    }
    const tabContentsMap = {
      scheme: (
        <Tab eventKey="scheme" title="Scheme" key={`scheme_${reaction.id}`}>
          <div className="d-flex align-items-center">
            <Dropdown ref={this.schemeDropdownRef}>
              <Dropdown.Toggle variant="info" size="sm" id="scheme-type-dropdown">
                <i className="fa fa-cog" />
                <span className="ms-1">
                  Current Scheme:&nbsp;
                  {schemeType}
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item
                  active={!reaction.gaseous && !reaction.weight_percentage}
                  onClick={() => this.handleReactionSchemeChange('default')}
                >
                  Default Scheme
                </Dropdown.Item>
                <Dropdown.Item
                  active={reaction.gaseous}
                  onClick={() => this.handleReactionSchemeChange('gaseous')}
                >
                  Gas Scheme
                </Dropdown.Item>
                <Dropdown.Item
                  active={reaction.weight_percentage}
                  onClick={() => this.handleReactionSchemeChange('weight_percentage')}
                >
                  Weight Percentage Scheme
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Overlay
              target={() => this.schemeDropdownRef.current}
              show={showSchemeChangeConfirm}
              placement="bottom"
              rootClose
              onHide={() => this.cancelSchemeChange()}
            >
              <Tooltip placement="bottom" className="in" id="scheme-change-confirm-tooltip">
                Any Assigned Weight percentage reference and wt% values in wt% fields
                <br />
                of materials will be deleted.
                <br />
                Switch scheme?
                <br />
                <ButtonToolbar className="gap-2 justify-content-center mt-1">
                  <Button
                    variant="danger"
                    size="xxsm"
                    onClick={() => this.confirmSchemeChange()}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="warning"
                    size="xxsm"
                    onClick={() => this.cancelSchemeChange()}
                  >
                    Discard
                  </Button>
                </ButtonToolbar>
              </Tooltip>
            </Overlay>
            {reaction.weight_percentage && (
              <>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="wt-info-tooltip">Weight percentage scheme info</Tooltip>}
                >
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="ms-2 d-flex justify-content-center"
                    onClick={this.openWtInfoModal}
                    title="Weight percentage scheme info"
                  >
                    <i className="fa fa-info-circle" />
                  </Button>
                </OverlayTrigger>
                {documentComponent}
              </>
            )}
          </div>
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
          key={`reaction-graphic-${reaction.id}-${this.state.reactionSvgVersion || 0}`}
          reaction={reaction}
          onToggleLabel={(materialId) => {
            reaction.toggleShowLabelForSample(materialId);
            this.handleReactionChange(reaction, { updateGraphic: true });
          }}
          onRefresh={() => this.refreshGraphic()}
          isRefreshing={this.state.isRefreshingGraphic || false}
        />
        <Modal show={this.state.showWtInfoModal} onHide={this.closeWtInfoModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>Weight Percentage Reaction Scheme</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              The weight percentage scheme lets you set a reference material and a
              target mass. Other materials can be assigned a weight percentage
              (wt%) in the interval [0,1], and their mass will be computed as equal to
              target_mass * wt%.
            </p>
            <p>
              <strong>Key points: </strong>
              select a reference material, set its target amount, enter
              wt% for desired starting materials/reactants, and the system will
              automatically recalculate amounts of those materials.
            </p>
            <p>
              For full details and examples see the
              <a href={documentationLink} target="_blank" rel="noreferrer" className="ms-1">documentation</a>
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={this.closeWtInfoModal}>Close</Button>
          </Modal.Footer>
        </Modal>
        {this.state.sfn && <ScifinderSearch el={reaction} />}
        <div className="tabs-container--with-borders">
          <ElementDetailSortTab
            type="reaction"
            availableTabs={Object.keys(tabContentsMap)}
            onTabPositionChanged={this.onTabPositionChanged}
            openedFromCollectionId={this.props.openedFromCollectionId}
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
  openedFromCollectionId: PropTypes.number,
};
