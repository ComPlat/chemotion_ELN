/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, {
  memo, useCallback, useEffect, useMemo, useReducer, useRef, useState
} from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tabs, Tab, OverlayTrigger, Tooltip, ButtonToolbar, Dropdown, Overlay, Form, Alert
} from 'react-bootstrap';
import { findIndex, isEmpty } from 'lodash';
import { Select } from 'src/components/common/Select';

import ElementResearchPlanLabels from 'src/apps/mydb/elements/labels/ElementResearchPlanLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import ReactionVariations, {
  REACTION_VARIATIONS_TAB_KEY
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ReactionDetailsContainers from 'src/apps/mydb/elements/details/reactions/analysesTab/ReactionDetailsContainers';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import { handleInputChange } from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import { convertVariationDatasetToInternalVariations }
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
// eslint-disable-next-line max-len
import ReactionDetailsProperties
  from 'src/apps/mydb/elements/details/reactions/propertiesTab/ReactionDetailsProperties';
import GreenChemistry from 'src/apps/mydb/elements/details/reactions/greenChemistryTab/GreenChemistry';
import Utils from 'src/utilities/Functions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import { aviatorNavigation } from 'src/utilities/routesUtils';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ExportSamplesButton from 'src/apps/mydb/elements/details/ExportSamplesButton';
import { permitOn } from 'src/components/common/uis';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import AppModal from 'src/components/common/AppModal';
import { List } from 'immutable';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import ScifinderSearch from 'src/components/scifinder/ScifinderSearch';
import MatrixCheck from 'src/components/common/MatrixCheck';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import ReactionSchemeGraphic from 'src/apps/mydb/elements/details/reactions/ReactionSchemeGraphic';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';
import isEqual from 'lodash/isEqual';
import DocumentationButton from 'src/components/common/DocumentationButton';
import { statusOptions } from 'src/components/staticDropdownOptions/options';
import Reaction from 'src/models/Reaction';

/*
VersionsTable calls `parent.setState` only for the element types it reloads in place; a reaction is
closed and reopened instead, so the prop is never read here. It is required, hence the stub.
*/
const VERSIONS_TABLE_PARENT = {};

const formatReactionTypeOption = (option, { context }) => (
  context === 'value'
    ? (
      <span>
        <i className="fa fa-flask me-1"/>
        {`Reaction type: ${option.label}`}
      </span>
    )
    : option.label
);

const productLink = (product, active) => (
  <span>
    {active && 'Sample Analysis:'}
    <span
      aria-hidden="true"
      className="pseudo-link"
      onClick={() => aviatorNavigation('sample', product.id, true, true)}
      title="Open sample window"
    >
      <i className="icon-sample mx-1"/>
      {product.title()}
    </span>
  </span>
);

const updateReactionVesselSize = (reaction) => {
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
};

/**
 * Updates the weight percentage reference material and target amount in the store.
 *
 * This is called when the reaction is in weight percentage mode to synchronize
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
 * @param {Object} reaction - The reaction object containing weight percentage reference data
 */
const updateWeightPercentageReference = (reaction) => {
  if (!reaction) return;

  const { weightPercentageReference, targetAmount } = reaction.findWeightPercentageReferenceMaterial();
  if (!weightPercentageReference) return;

  // Ensure we don't dispatch while another Alt dispatch is in progress.
  setTimeout(() => {
    WeightPercentageReactionActions.setWeightPercentageReference(weightPercentageReference);
    WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(targetAmount);
  }, 0);
};

const ReactionDetails = ({ reaction: reactionFromProps, openedFromCollectionId }) => {
  const [reaction, setReactionState] = useState(reactionFromProps);
  const [activeTab, setActiveTab] = useState(() => UIStore.getState().reaction.activeTab);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState(() => UIStore.getState().reaction.activeAnalysisTab);
  const [visible, setVisible] = useState(() => List());
  const [variations, setVariationsState] = useState(
    () => convertVariationDatasetToInternalVariations(reactionFromProps)
  );
  // Bumped when the graphic is updated so the <ReactionSchemeGraphic> key changes (we mutate reaction in place)
  const [reactionSvgVersion, setReactionSvgVersion] = useState(0);
  const [isRefreshingGraphic, setIsRefreshingGraphic] = useState(false);
  const [isEditingHeaderName, setIsEditingHeaderName] = useState(false);
  const [headerNameDraft, setHeaderNameDraft] = useState(reactionFromProps.name || '');
  const [showWtInfoModal, setShowWtInfoModal] = useState(false);
  const [pendingSchemeType, setPendingSchemeType] = useState(null);
  const [schemeChangeConfirmMessage, setSchemeChangeConfirmMessage] = useState(null);

  // Read once, like the class constructor did.
  const sfn = useMemo(() => UIStore.getState().hasSfn, []);
  const currentUser = useMemo(() => (UserStore.getState() && UserStore.getState().currentUser) || {}, []);

  // Latest reaction, for the callbacks and promise chains that must not close over a stale one.
  const reactionRef = useRef(reactionFromProps);
  const isUpdatingGraphicRef = useRef(false); // Flag to prevent infinite loops
  const pendingGraphicReactionRef = useRef(null); // Queued reaction when update requested during in-flight fetch
  const updateGraphicRef = useRef(null);
  const previousReactionPropRef = useRef(reactionFromProps);
  const wasWeightPercentageRef = useRef(!!reactionFromProps.weight_percentage);
  const schemeDropdownRef = useRef(null);
  const headerNameInputRef = useRef(null);
  const [, forceUpdate] = useReducer((count) => count + 1, 0);

  /*
  The reaction model is mutated in place by the update handlers, so the state setter alone would bail
  out on the unchanged identity - every assignment is therefore paired with a forced re-render.
  */
  const setReaction = useCallback((nextReaction) => {
    reactionRef.current = nextReaction;
    setReactionState(nextReaction);
    setVariationsState(convertVariationDatasetToInternalVariations(reactionFromProps));
    forceUpdate();
  }, []);

  // Same for the variations list, which the variations tab edits in place and hands straight back.
  const setVariations = useCallback((nextVariations) => {
    setVariationsState(nextVariations);
    forceUpdate();
  }, []);

  const updateGraphic = useCallback((reactionFromChange) => {
    // Use the reaction passed from handleReactionChange when available so we have the latest data (e.g. conditions)
    const graphicReaction = reactionFromChange || reactionRef.current;

    // If a fetch is already in progress, queue this reaction to update again when it completes
    if (isUpdatingGraphicRef.current) {
      pendingGraphicReactionRef.current = graphicReaction;
      return;
    }

    isUpdatingGraphicRef.current = true;
    const materialsSvgPaths = {
      starting_materials: graphicReaction.starting_materials.map((material) => material.svgPath),
      reactants: graphicReaction.reactantsWithSbmm.map((material) => material.svgPath),
      products: graphicReaction.products.map((material) => [material.svgPath, material.equivalent])
    };

    const solvents = graphicReaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter((s) => s);

    let temperature = graphicReaction.temperature_display;
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = `${temperature} ${graphicReaction.temperature.valueUnit}`;
    }
    const productsOnly = graphicReaction.isInteractionReaction();
    const showYield = !productsOnly;

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(
      materialsSvgPaths,
      temperature,
      solvents,
      graphicReaction.duration,
      graphicReaction.conditions,
      productsOnly,
      showYield
    ).then((result) => {
      if (result && result.reaction_svg && result.reaction_svg !== graphicReaction.reaction_svg_file) {
        // Update reaction_svg_file and state - image will reload automatically via ReactionSchemeGraphic useEffect
        graphicReaction.reaction_svg_file = result.reaction_svg;
        setReaction(graphicReaction);
      }
    }).catch((error) => {
      console.error('Error updating reaction graphic:', error);
    }).finally(() => {
      isUpdatingGraphicRef.current = false;
      // If a condition/material change was requested while we were fetching, update with latest data
      if (pendingGraphicReactionRef.current) {
        const pending = pendingGraphicReactionRef.current;
        pendingGraphicReactionRef.current = null;
        updateGraphicRef.current(pending);
      }
    });
  }, [setReaction]);
  // Lets the drain above call back into this same callback (it is identity-stable).
  updateGraphicRef.current = updateGraphic;

  const refreshGraphic = useCallback(() => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingGraphic) {
      return;
    }

    // Mark reaction as changed so save button is enabled when user clicks refresh
    reactionRef.current.changed = true;

    // Set loading state and enable save button
    setIsRefreshingGraphic(true);
    forceUpdate();

    // Use requestAnimationFrame to ensure React has rendered before starting async operations
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Collect all materials with their molfile and svgPath
        const currentReaction = reactionRef.current;
        const allMaterials = [
          ...currentReaction.starting_materials,
          ...currentReaction.reactants,
          ...currentReaction.products,
        ].filter((material) => material.molfile && material.svgPath);

        if (allMaterials.length === 0) {
          // Keep loading state visible briefly so user sees feedback when there's nothing to refresh
          setTimeout(() => setIsRefreshingGraphic(false), 400);
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
            forceUpdate();
            updateGraphic();
          })
          .catch((error) => {
            console.error('Error batch refreshing material SVGs:', error);
            // Still try to update graphic even if batch refresh failed
            updateGraphic();
          })
          .finally(() => {
            // Reset loading state
            setIsRefreshingGraphic(false);
          });
      });
    });
  }, [isRefreshingGraphic, updateGraphic]);

  const handleReactionChange = useCallback((changedReaction, options = {}) => {
    changedReaction.updateMaxAmountOfProducts();
    changedReaction.changed = true;
    // ReactionSchemeGraphic reloads the image on its own, so plain changes only need the state update
    setReaction(changedReaction);
    if (options.updateGraphic && !isUpdatingGraphicRef.current) {
      // Only call updateGraphic if we're not already updating to prevent infinite loops
      updateGraphic(changedReaction);
    }
  }, [setReaction, updateGraphic]);

  const onInputChange = useCallback((type, event) => {
    handleInputChange(type, event, reactionRef.current, handleReactionChange);
  }, [handleReactionChange]);

  const handleProductChange = useCallback((product, cb) => {
    const currentReaction = reactionRef.current;

    currentReaction.updateMaterial(product);
    currentReaction.changed = true;

    setReaction(currentReaction);
    if (cb) cb();
  }, [setReaction]);

  const handleSubmit = useCallback((closeView = false) => {
    LoadingActions.start();

    const currentReaction = reactionRef.current;
    if (currentReaction && currentReaction.isNew) {
      ElementActions.createReaction(currentReaction);
    } else {
      ElementActions.updateReaction(currentReaction, closeView);
    }

    if (currentReaction.is_new || closeView) {
      DetailActions.close(currentReaction, true);
    }
  }, []);

  const handleSegmentsChange = useCallback((se) => {
    const currentReaction = reactionRef.current;
    const { segments } = currentReaction;
    const idx = findIndex(segments, (o) => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) {
      segments.splice(idx, 1, se);
    } else {
      segments.push(se);
    }
    currentReaction.segments = segments;
    currentReaction.changed = true;
    setReaction(currentReaction);
  }, [setReaction]);

  const handleSelect = useCallback((key) => {
    UIActions.selectTab({ tabKey: key, type: 'reaction' });
    setActiveTab(key);
  }, []);

  const handleSelectActiveAnalysisTab = useCallback((key) => {
    UIActions.selectActiveAnalysisTab(key);
    setActiveAnalysisTab(key);
  }, []);

  const onUIStoreChange = useCallback((state) => {
    setActiveTab((current) => (state.reaction.activeTab !== current ? state.reaction.activeTab : current));
    setActiveAnalysisTab((current) => (
      state.reaction.activeAnalysisTab !== current ? state.reaction.activeAnalysisTab : current
    ));
  }, []);

  const openHeaderNameEditor = useCallback(() => {
    const currentReaction = reactionRef.current;
    if (!permitOn(currentReaction) || currentReaction.isMethodDisabled('name')) {
      return;
    }

    setHeaderNameDraft(currentReaction.name || '');
    setIsEditingHeaderName(true);
  }, []);

  const handleHeaderNameDraftChange = useCallback((event) => {
    setHeaderNameDraft(event.target.value);
  }, []);

  const commitHeaderNameChange = useCallback(() => {
    const currentReaction = reactionRef.current;
    const nextName = headerNameDraft.trim();

    setIsEditingHeaderName(false);
    if (nextName === (currentReaction.name || '')) {
      return;
    }

    onInputChange('name', { target: { value: nextName } });
  }, [headerNameDraft, onInputChange]);

  const cancelHeaderNameChange = useCallback(() => {
    setIsEditingHeaderName(false);
    setHeaderNameDraft(reactionRef.current.name || '');
  }, []);

  const openWtInfoModal = useCallback(() => setShowWtInfoModal(true), []);
  const closeWtInfoModal = useCallback(() => setShowWtInfoModal(false), []);

  /**
   * Applies the scheme change without confirmation.
   * Called directly when no confirmation is required, or after user confirms.
   *
   * @param {string} type - The scheme type to switch to ('default', 'gaseous', 'weight_percentage')
   */
  const applySchemeChange = useCallback((type) => {
    const currentReaction = reactionRef.current;

    if (type === 'default') {
      // Reset weight_percentage_reference for all materials when leaving weight percentage mode
      currentReaction.resetWeightPercentagedependencies();
      // Recalculate equivalents for starting materials and reactants
      currentReaction.recalculateEquivalentsForMaterials();

      onInputChange('weight_percentage', false);
      onInputChange('gaseous', false);
    } else if (type === 'weight_percentage') {
      onInputChange('weight_percentage', true);
      onInputChange('gaseous', false);
      currentReaction.assignWeightPercentageReference();
    } else if (type === 'gaseous') {
      // Reset weight percentage data when switching to gaseous from weight_percentage
      currentReaction.resetWeightPercentagedependencies();
      currentReaction.recalculateEquivalentsForMaterials();

      onInputChange('gaseous', true);
      onInputChange('weight_percentage', false);
    }
  }, [onInputChange]);

  const handleReactionSchemeChange = useCallback((nextSchemeType) => {
    const currentReaction = reactionRef.current;

    let currentSchemeType = 'default';
    if (currentReaction.weight_percentage) currentSchemeType = 'weight_percentage';
    if (currentReaction.gaseous) currentSchemeType = 'gaseous';

    if (nextSchemeType === currentSchemeType) {
      return;
    }

    const isSwitchingFromWeightPercentage = (nextSchemeType !== 'weight_percentage')
      && (currentSchemeType === 'weight_percentage');
    const isSwitchingFromGas = (nextSchemeType !== 'gaseous') && (currentSchemeType === 'gaseous');
    const isSwitchingToGas = (nextSchemeType === 'gaseous') && (currentSchemeType !== 'gaseous');

    const schemeSwitchClearsVariations = isSwitchingFromGas || isSwitchingToGas;

    const schemeSwitchRequiresConfirmation = isSwitchingFromWeightPercentage || schemeSwitchClearsVariations;
    if (schemeSwitchRequiresConfirmation) {
      let confirmMessage;
      if (schemeSwitchClearsVariations && isSwitchingFromWeightPercentage) {
        confirmMessage = (
          <>
            Switching scheme will clear the Variations table, data will be lost.
            <br/>
            Any assigned weight percentage reference and wt% values in wt% fields
            <br/>
            of materials will be deleted.
            <br/>
            Switch scheme?
          </>
        );
      } else if (schemeSwitchClearsVariations) {
        confirmMessage = (
          <>
            Switching scheme will clear the Variations table, data will be lost. Switch scheme?
          </>
        );
      } else {
        confirmMessage = (
          <>
            Any assigned weight percentage reference and wt% values in wt% fields
            <br/>
            of materials will be deleted.
            <br/>
            Switch scheme?
          </>
        );
      }

      setPendingSchemeType(nextSchemeType);
      setSchemeChangeConfirmMessage(confirmMessage);
      return;
    }

    applySchemeChange(nextSchemeType);
  }, [applySchemeChange]);

  /**
   * Confirms the pending scheme change and applies it.
   * Called when user clicks "Confirm" in the scheme change confirmation dialog.
   */
  const confirmSchemeChange = useCallback(() => {
    setPendingSchemeType(null);
    setSchemeChangeConfirmMessage(null);
    if (pendingSchemeType) {
      applySchemeChange(pendingSchemeType);
    }
  }, [pendingSchemeType, applySchemeChange]);

  /**
   * Cancels the pending scheme change.
   * Called when user clicks "Discard" in the scheme change confirmation dialog.
   */
  const cancelSchemeChange = useCallback(() => {
    setPendingSchemeType(null);
    setSchemeChangeConfirmMessage(null);
  }, []);

  const onTabPositionChanged = useCallback((nextVisible) => setVisible(nextVisible), []);

  // componentDidMount
  useEffect(() => {
    UIStore.listen(onUIStoreChange);
    setTimeout(() => {
      GasPhaseReactionActions.gaseousReaction(reactionFromProps.gaseous);
      // Initialize gas phase store with vessel size and catalyst values
      updateReactionVesselSize(reactionFromProps);
    }, 0);

    if (MatrixCheck(currentUser.matrix, commentActivation) && !reactionFromProps.isNew) {
      CommentActions.fetchComments(reactionFromProps);
    }

    // If opened in weight percentage mode, ensure store is synchronized on mount
    if (reactionFromProps && reactionFromProps.weight_percentage) {
      updateWeightPercentageReference(reactionFromProps);
    }

    // If reaction type is Interaction, always regenerate the scheme preview on load because
    // they intentionally use the products-only graphic, even if an older SVG exists.
    if (!reactionFromProps.reaction_svg_file || reactionFromProps.isInteractionReaction()) {
      updateGraphic(reactionFromProps);
    }

    return () => UIStore.unlisten(onUIStoreChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // componentDidUpdate: adopt a reaction handed down from the store
  useEffect(() => {
    const previousReactionProp = previousReactionPropRef.current;
    previousReactionPropRef.current = reactionFromProps;
    if (isEqual(reactionFromProps, previousReactionProp)) return;

    // Same reaction (e.g. after save): keep current reaction_svg_file so SVG doesn't go white when server omits or
    // delays it
    const previousReaction = reactionRef.current;
    const isSameReaction = previousReaction?.id != null && reactionFromProps?.id === previousReaction.id;
    const previousSvg = previousReaction?.reaction_svg_file;
    const hasPreviousSvg = previousSvg !== undefined && previousSvg !== null && String(previousSvg).trim() !== '';

    if (isSameReaction && hasPreviousSvg) {
      reactionFromProps.reaction_svg_file = previousSvg;
      setReactionSvgVersion((version) => version + 1);
    }

    if (!isEditingHeaderName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeaderNameDraft(reactionFromProps.name || '');
    }
    setReaction(reactionFromProps);

    wasWeightPercentageRef.current = !!reactionFromProps.weight_percentage;
    if (reactionFromProps.weight_percentage) {
      updateWeightPercentageReference(reactionFromProps);
    }
    // Update gas phase store when reaction changes (e.g., loading new reaction)
    setTimeout(() => {
      updateReactionVesselSize(reactionFromProps);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactionFromProps]);

  // Sync the store when the reaction stored in state toggles into weight_percentage
  useEffect(() => {
    const isWeightPercentage = !!reaction?.weight_percentage;
    const wasWeightPercentage = wasWeightPercentageRef.current;
    wasWeightPercentageRef.current = isWeightPercentage;

    if (isWeightPercentage && !wasWeightPercentage) {
      updateWeightPercentageReference(reaction);
    }
  });

  // The class component did this in render(); the dispatch is deferred by a timeout either way.
  useEffect(() => {
    updateReactionVesselSize(reaction);
  });

  useEffect(() => {
    if (!isEditingHeaderName) return;
    headerNameInputRef.current?.focus();
    headerNameInputRef.current?.select();
  }, [isEditingHeaderName]);

  const reactionIsValid = () => reaction.hasMaterials() && reaction.SMGroupValid();

  const renderReactionTypeSelect = () => {
    const selectedReactionType = reaction.reaction_type || 'standard';

    return (
      <Form.Group className="reaction-details-toolbar__group mb-0 me-2">
        <Select
          size="sm"
          name="reaction_type"
          isClearable={false}
          options={Reaction.reaction_type_options}
          formatOptionLabel={formatReactionTypeOption}
          value={Reaction.reaction_type_options.find(({ value }) => value === selectedReactionType)}
          isDisabled={!permitOn(reaction)}
          onChange={(option) => onInputChange('reactionType', option?.value || 'standard')}
        />
      </Form.Group>
    );
  };

  const renderHeaderNameInput = () => (
    <Form.Control
      ref={headerNameInputRef}
      size="sm"
      type="text"
      name="reaction_name"
      value={headerNameDraft}
      placeholder="Reaction name"
      className="reaction-details-header__title-input d-inline-block"
      onChange={handleHeaderNameDraftChange}
      onBlur={commitHeaderNameChange}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitHeaderNameChange();
        } else if (event.key === 'Escape') {
          cancelHeaderNameChange();
        }
      }}
    />
  );

  const renderHeaderNameDisplay = (canEditName) => {
    const titleClassName = `reaction-details-header__title-text${
      reaction.name ? '' : ' reaction-details-header__title-text--empty'
    }`;
    const titleLabel = reaction.name || 'Reaction name';

    if (!canEditName) {
      return (
        <span className={titleClassName}>
          {titleLabel}
        </span>
      );
    }

    return (
      <button
        type="button"
        className={titleClassName}
        aria-label={`Edit reaction name: ${titleLabel}`}
        onClick={openHeaderNameEditor}
        title="Edit reaction name"
      >
        {titleLabel}
      </button>
    );
  };

  const renderHeaderTitle = () => {
    const titlePrefix = reaction.short_label || '';
    const canEditName = permitOn(reaction) && !reaction.isMethodDisabled('name');
    const titleContent = isEditingHeaderName
      ? renderHeaderNameInput()
      : renderHeaderNameDisplay(canEditName);

    return (
      <span className="reaction-details-header__title">
        {titlePrefix && (
          <span className="reaction-details-header__title-prefix me-1">{titlePrefix}</span>
        )}
        {titleContent}
      </span>
    );
  };

  const productData = () => {
    const { products } = reaction;

    const tabs = products.map((product, key) => {
      const isActiveTab = key.toString() === activeAnalysisTab;
      const title = productLink(product, isActiveTab);
      const setState = () => handleProductChange(product);
      const handleSampleChanged = (_, cb) => handleProductChange(product, cb);

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
            handleSubmit={handleSubmit}
          />
        </Tab>
      );
    });
    const reactionTab = (
      <span>
        {activeAnalysisTab === '4.1' && 'Reaction Analysis:'}
        <i className="icon-reaction mx-1"/>
        {reaction.short_label}
      </span>
    );
    return (
      <div className="tabs-container--with-borders">
        <Tabs
          id="data-detail-tab"
          unmountOnExit
          activeKey={activeAnalysisTab}
          onSelect={handleSelectActiveAnalysisTab}
        >
          {tabs}
          <Tab eventKey={4.1} title={reactionTab}>
            <ReactionDetailsContainers
              reaction={reaction}
              readOnly={!permitOn(reaction)}
              handleSubmit={handleSubmit}
              handleReactionChange={handleReactionChange}
            />
          </Tab>
        </Tabs>
      </div>
    );
  };

  const isInteractionReaction = reaction.isInteractionReaction();
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

        {variations.length > 0 && (
          <Alert variant="info">
            This reaction has {reaction.variations.length} variations. Reactants cannot be edited in a reaction with
            variations.
          </Alert>
        )}
        <div className="d-flex align-items-center">
          {renderReactionTypeSelect()}
          {!isInteractionReaction && (
            <Dropdown ref={schemeDropdownRef}>
              <Dropdown.Toggle
                variant="info"
                size="sm"
                id="scheme-type-dropdown"
                disabled={!permitOn(reaction)}
              >
                <i className="fa fa-cog"/>
                <span className="ms-1">
                  Current Scheme:&nbsp;
                  {schemeType}
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item
                  active={!reaction.gaseous && !reaction.weight_percentage}
                  onClick={() => handleReactionSchemeChange('default')}
                >
                  Default Scheme
                </Dropdown.Item>
                <Dropdown.Item
                  active={reaction.gaseous}
                  onClick={() => handleReactionSchemeChange('gaseous')}
                >
                  Gas Scheme
                </Dropdown.Item>
                <Dropdown.Item
                  active={reaction.weight_percentage}
                  onClick={() => handleReactionSchemeChange('weight_percentage')}
                >
                  Weight Percentage Scheme
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
          {!isInteractionReaction && (
            <Overlay
              target={() => schemeDropdownRef.current}
              show={!!schemeChangeConfirmMessage}
              placement="bottom"
              rootClose
              onHide={cancelSchemeChange}
            >
              <Tooltip placement="bottom" className="in" id="scheme-change-confirm-tooltip">
                {schemeChangeConfirmMessage}
                <br/>
                <ButtonToolbar className="justify-content-center mt-1">
                  <Button
                    variant="danger"
                    size="xxsm"
                    onClick={confirmSchemeChange}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="warning"
                    size="xxsm"
                    onClick={cancelSchemeChange}
                  >
                    Discard
                  </Button>
                </ButtonToolbar>
              </Tooltip>
            </Overlay>
          )}
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
                  onClick={openWtInfoModal}
                  title="Weight percentage scheme info"
                >
                  <i className="fa fa-info-circle"/>
                </Button>
              </OverlayTrigger>
              {documentComponent}
            </>
          )}
          <div className="reaction-details-toolbar__right d-flex align-items-end">
            <Form.Group className="reaction-details-toolbar__group reaction-details-toolbar__group--status mb-0">
              <Select
                size="sm"
                name="status"
                isClearable
                placeholder="Status"
                options={statusOptions}
                value={statusOptions.find(({ value }) => value === reaction.status)}
                isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('status')}
                onChange={(option) => {
                  const wrappedEvent = { target: { value: option?.value || null } };
                  onInputChange('status', wrappedEvent);
                }}
              />
            </Form.Group>
          </div>
        </div>
        {
          !reaction.isNew && <CommentSection section="reaction_scheme" element={reaction}/>
        }
        <ReactionDetailsScheme
          reaction={reaction}
          variations={variations}
          onReactionChange={(r, options) => handleReactionChange(r, options)}
          onInputChange={(type, event) => onInputChange(type, event)}
        />
      </Tab>
    ),
    properties: (
      <Tab eventKey="properties" title="Properties" key={`properties_${reaction.id}`}>
        {
          !reaction.isNew && <CommentSection section="reaction_properties" element={reaction}/>
        }
        <ReactionDetailsProperties
          reaction={reaction}
          onReactionChange={(r) => handleReactionChange(r)}
          onInputChange={(type, event) => onInputChange(type, event)}
          key={reaction.checksum}
        />
      </Tab>
    ),
    references: (
      <Tab eventKey="references" title="References" key={`references_${reaction.id}`}>
        {
          !reaction.isNew && <CommentSection section="reaction_references" element={reaction}/>
        }
        <DetailsTabLiteratures
          element={reaction}
          literatures={reaction.isNew ? reaction.literatures : null}
          onElementChange={(r) => handleReactionChange(r)}
        />
      </Tab>
    ),
    analyses: (
      <Tab eventKey="analyses" title="Analyses" key={`analyses_${reaction.id}`}>
        {
          !reaction.isNew && <CommentSection section="reaction_analyses" element={reaction}/>
        }
        {productData()}
      </Tab>
    ),
    green_chemistry: (
      <Tab eventKey="green_chemistry" title="Green Chemistry" key={`green_chem_${reaction.id}`}>
        {
          !reaction.isNew && <CommentSection section="reaction_green_chemistry" element={reaction}/>
        }
        <GreenChemistry
          reaction={reaction}
          onReactionChange={handleReactionChange}
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
          variations={variations}
          setVariations={setVariations}
          onReactionChange={handleReactionChange}
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
          parent={VERSIONS_TABLE_PARENT}
          isEdited={reaction.changed}
        />
      </Tab>
    ),
  };

  addSegmentTabs(reaction, handleSegmentsChange, tabContentsMap);

  const tabContents = [];
  visible.forEach((value) => {
    const tabContent = tabContentsMap[value];
    if (tabContent) {
      tabContents.push(tabContent);
    }
  });

  const currentTab = (activeTab !== 0 && activeTab) || visible[0];

  const titleTooltip = formatTimeStampsOfElement(reaction || {});

  const title = renderHeaderTitle();

  const titleAppendix = (
    <>
      {!reaction.isNew && !isEmpty(reaction.research_plans) && (
        <ElementResearchPlanLabels plans={reaction.research_plans} key={reaction.id} placement="right"/>
      )}
      <ElementAnalysesLabels element={reaction} key={`${reaction.id}_analyses`}/>
    </>
  );

  const headerToolbar = (
    <OverlayTrigger
      overlay={<Tooltip id="generateReport">Generate Report</Tooltip>}
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={reaction.changed || reaction.isNew}
        title={(reaction.changed || reaction.isNew)
          ? 'Report can be generated after reaction is saved.'
          : 'Generate report for this reaction'}
        onClick={() => Utils.downloadFile({
          contents: `/api/v1/reports/docx?id=${reaction.id}`,
          name: reaction.name
        })}
      >
        <i className="fa fa-cogs"/>
      </Button>
    </OverlayTrigger>
  );

  const footerToolbar = !reaction.isNew && (
    <ExportSamplesButton type="reaction" id={reaction.id}/>
  );

  const showSave = reaction.changed || reaction.isNew;
  const saveDisabled = !permitOn(reaction) || !reactionIsValid();

  return (
    <ElementDetailCard
      element={reaction}
      isPendingToSave={reaction.isPendingToSave}
      title={title}
      titleTooltip={titleTooltip}
      titleAppendix={titleAppendix}
      headerToolbar={headerToolbar}
      footerToolbar={footerToolbar}
      onSave={() => handleSubmit()}
      onSaveClose={() => handleSubmit(true)}
      showSave={showSave}
      saveDisabled={saveDisabled}
      showPrintCode
      showCalendar
    >
      <ReactionSchemeGraphic
        key={`reaction-graphic-${reaction.id}-${reactionSvgVersion || 0}`}
        reaction={reaction}
        onToggleLabel={(materialId, isSbmm) => {
          reaction.toggleShowLabelForSample(materialId, isSbmm);
          handleReactionChange(reaction, { updateGraphic: true });
        }}
        onRefresh={refreshGraphic}
        isRefreshing={isRefreshingGraphic || false}
      />
      <AppModal
        show={showWtInfoModal}
        onHide={closeWtInfoModal}
        title="Weight Percentage Reaction Scheme"
        showFooter
        closeLabel="Close"
      >
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
      </AppModal>
      {sfn && <ScifinderSearch el={reaction}/>}
      <div className="tabs-container--with-borders">
        <ElementDetailSortTab
          type="reaction"
          availableTabs={Object.keys(tabContentsMap)}
          onTabPositionChanged={onTabPositionChanged}
          openedFromCollectionId={openedFromCollectionId}
        />
        <Tabs
          mountOnEnter
          activeKey={currentTab}
          onSelect={handleSelect}
          id="reaction-detail-tab"
          unmountOnExit
          className="has-config-overlay"
        >
          {tabContents}
        </Tabs>
        <CommentModal element={reaction}/>
      </div>
    </ElementDetailCard>
  );
};

ReactionDetails.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  reaction: PropTypes.object,
  openedFromCollectionId: PropTypes.number,
};

/*
Replaces the shouldComponentUpdate of the class component: it skipped a render triggered by the
parent unless the incoming reaction was a different one, had been saved, had a new scheme image, or
carried unsaved changes. React keeps the last *rendered* props as the baseline for this comparison,
so a skipped render never advances it - the same as comparing against the reaction held in state.
*/
const arePropsEqual = (previousProps, nextProps) => {
  const previousReaction = previousProps.reaction;
  const nextReaction = nextProps.reaction;

  return previousProps.openedFromCollectionId === nextProps.openedFromCollectionId
    && previousReaction.id === nextReaction.id
    && previousReaction.updated_at === nextReaction.updated_at
    && previousReaction.reaction_svg_file === nextReaction.reaction_svg_file
    && !nextReaction.changed
    && !nextReaction.editedSample;
};

export default memo(ReactionDetails, arePropsEqual);

export {
  handleInputChange
};
