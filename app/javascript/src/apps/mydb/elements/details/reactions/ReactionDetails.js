/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/require-default-props */
import React, {
  useCallback, useEffect, useReducer, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tabs, Tab, OverlayTrigger, Tooltip, ButtonToolbar, Dropdown, Modal, Overlay,
} from 'react-bootstrap';
import { findIndex, isEmpty } from 'lodash';
import isEqual from 'lodash/isEqual';
import Immutable from 'immutable';

import ElementResearchPlanLabels from 'src/apps/mydb/elements/labels/ElementResearchPlanLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import ReactionVariations from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';
import {
  REACTION_VARIATIONS_TAB_KEY,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ReactionDetailsContainers from 'src/apps/mydb/elements/details/reactions/analysesTab/ReactionDetailsContainers';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
// eslint-disable-next-line max-len
import ReactionDetailsProperties from 'src/apps/mydb/elements/details/reactions/propertiesTab/ReactionDetailsProperties';
import GreenChemistry from 'src/apps/mydb/elements/details/reactions/greenChemistryTab/GreenChemistry';
import Utils from 'src/utilities/Functions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import { setReactionByType } from 'src/apps/mydb/elements/details/reactions/ReactionDetailsShare';
import { aviatorNavigation } from 'src/utilities/routesUtils';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import { rfValueFormat } from 'src/utilities/ElementUtils';
import ExportSamplesButton from 'src/apps/mydb/elements/details/ExportSamplesButton';
import { permitOn } from 'src/components/common/uis';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
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
import DocumentationButton from 'src/components/common/DocumentationButton';

// ---------- utils ----------

// Types whose dispatched `event` argument is already the final value (i.e. no .target.value extraction).
const DIRECT_VALUE_TYPES = new Set([
  'temperatureUnit', 'temperatureData', 'description', 'role', 'observation',
  'durationUnit', 'duration', 'rxno', 'vesselSizeAmount', 'vesselSizeUnit',
  'gaseous', 'conditions', 'volume', 'useReactionVolumeForConcentration',
  'weight_percentage', 'default',
]);

const VESSEL_SIZE_TYPES = new Set(['vesselSizeAmount', 'vesselSizeUnit']);

const TEMPERATURE_NUMERIC_PATTERN = /^[\-|\d]\d*\.{0,1}\d{0,2}$/;

const extractInputValue = (type, event) => {
  if (DIRECT_VALUE_TYPES.has(type)) return event;
  if (type === 'rfValue') return rfValueFormat(event.target.value) || '';
  return event.target.value;
};

const collectRefreshableMaterials = (reaction) => [
  ...reaction.starting_materials,
  ...reaction.reactants,
  ...reaction.products,
].filter((material) => material.molfile && material.svgPath);

const collectMaterialsForWeightPercentageReset = (reaction) => [
  ...reaction.starting_materials,
  ...reaction.reactants,
  ...reaction.products,
  ...reaction.solvents,
];

const resetWeightPercentageDependencies = (reaction) => {
  collectMaterialsForWeightPercentageReset(reaction).forEach((material) => {
    material.weight_percentage_reference = false;
    material.weight_percentage = null;
  });
  WeightPercentageReactionActions.setWeightPercentageReference(null);
  WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(null);
};

const recalculateEquivalentsForMaterials = (reaction) => {
  const { referenceMaterial } = reaction;
  if (!referenceMaterial || !referenceMaterial.amount_mol) return;

  [...reaction.starting_materials, ...reaction.reactants].forEach((material) => {
    if (!material.reference && material.amount_mol) {
      material.equivalent = material.amount_mol / referenceMaterial.amount_mol;
    }
  });
};

const assignWeightPercentageReference = (reaction) => {
  if (reaction.products.length === 0) return;
  const [firstProduct] = reaction.products;
  firstProduct.weight_percentage_reference = true;
  WeightPercentageReactionActions.setWeightPercentageReference(firstProduct);
  const targetAmount = {
    value: firstProduct.target_amount_value,
    unit: firstProduct.target_amount_unit,
  };
  WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(targetAmount);
};

const buildMaterialsSvgPaths = (reaction) => ({
  starting_materials: reaction.starting_materials.map((m) => m.svgPath),
  reactants: reaction.reactantsWithSbmm.map((m) => m.svgPath),
  products: reaction.products.map((m) => [m.svgPath, m.equivalent]),
});

const buildTemperatureDisplayForGraphic = (reaction) => {
  const display = reaction.temperature_display;
  return TEMPERATURE_NUMERIC_PATTERN.test(display)
    ? `${display} ${reaction.temperature.valueUnit}`
    : display;
};

const getSchemeType = (reaction) => {
  if (reaction.gaseous) return 'Gaseous';
  if (reaction.weight_percentage) return 'Weight Percentage';
  return 'Default';
};

const SCHEME_DOCUMENTATION = {
  Gaseous: {
    link: 'https://chemotion.net/docs/eln/ui/elements/reactions'
      + '?_highlight=weight&_highlight=p#gas-phase-reaction-scheme',
    overlayMessage: 'Click to open link to the documentation of the gas phase feature',
    omitDocumentationWord: false,
  },
  'Weight Percentage': {
    link: 'https://chemotion.net/docs/eln/ui/elements/reactions'
      + '?_highlight=weight&_highlight=p#weight-percentage-reaction-scheme',
    overlayMessage: 'Click to open link to the documentation of the weight percentage feature',
    omitDocumentationWord: true,
  },
};

const getSchemeDocumentation = (schemeType) => SCHEME_DOCUMENTATION[schemeType] || null;

const hasPersistedSvg = (reaction) => {
  const svg = reaction?.reaction_svg_file;
  return svg !== undefined && svg !== null && String(svg).trim() !== '';
};

const syncReactionVesselSizeToStore = (reaction) => {
  if (!reaction) return;
  const { catalystMoles, vesselSize } = reaction.findReactionVesselSizeCatalystMaterialValues();
  // Deferred to avoid dispatching while another Alt dispatch may be in progress.
  setTimeout(() => {
    GasPhaseReactionActions.setReactionVesselSize(vesselSize || null);
    GasPhaseReactionActions.setCatalystReferenceMole(catalystMoles || null);
  }, 0);
};

const syncWeightPercentageReferenceToStore = (reaction) => {
  if (!reaction) return;
  const { weightPercentageReference, targetAmount } = reaction.findWeightPercentageReferenceMaterial();
  if (!weightPercentageReference) return;
  setTimeout(() => {
    WeightPercentageReactionActions.setWeightPercentageReference(weightPercentageReference);
    WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(targetAmount);
  }, 0);
};

// ---------- reducer (reaction state) ----------

// Using a reducer so that dispatching with the same mutated object reference
// still triggers a re-render (mirrors class setState({ reaction }) behavior).
const reactionReducer = (state, action) => {
  switch (action.type) {
    case 'set':
      return { reaction: action.reaction, revision: state.revision + 1 };
    default:
      return state;
  }
};

// ---------- presentational sub-components ----------

const ProductLink = ({ product, active }) => (
  <span>
    {active && 'Sample Analysis:'}
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

const SchemeDocumentationButton = ({ config }) => {
  if (!config) return null;
  const extraProps = config.omitDocumentationWord ? { omitDocumentationWord: true } : {};
  return (
    <DocumentationButton
      link={config.link}
      overlayMessage={config.overlayMessage}
      className="ms-3 flex-shrink-0"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...extraProps}
    />
  );
};

const WtInfoButton = ({ onClick }) => (
  <OverlayTrigger
    placement="top"
    overlay={<Tooltip id="wt-info-tooltip">Weight percentage scheme info</Tooltip>}
  >
    <Button
      variant="outline-info"
      size="sm"
      className="ms-2 d-flex justify-content-center"
      onClick={onClick}
      title="Weight percentage scheme info"
    >
      <i className="fa fa-info-circle" />
    </Button>
  </OverlayTrigger>
);

const WeightPercentageInfoModal = ({ show, onHide, documentationLink }) => (
  <Modal show={show} onHide={onHide} centered>
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
      <Button variant="secondary" onClick={onHide}>Close</Button>
    </Modal.Footer>
  </Modal>
);

const SchemeChangeConfirmOverlay = ({
  show, target, onConfirm, onCancel,
}) => (
  <Overlay
    target={target}
    show={show}
    placement="bottom"
    rootClose
    onHide={onCancel}
  >
    <Tooltip placement="bottom" className="in" id="scheme-change-confirm-tooltip">
      Any Assigned Weight percentage reference and wt% values in wt% fields
      <br />
      of materials will be deleted.
      <br />
      Switch scheme?
      <br />
      <ButtonToolbar className="justify-content-center mt-1">
        <Button variant="danger" size="xxsm" onClick={onConfirm}>Confirm</Button>
        <Button variant="warning" size="xxsm" onClick={onCancel}>Discard</Button>
      </ButtonToolbar>
    </Tooltip>
  </Overlay>
);

const SchemeTypeDropdown = React.forwardRef(({
  reaction, schemeType, onSchemeChange,
}, ref) => (
  <Dropdown ref={ref}>
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
        onClick={() => onSchemeChange('default')}
      >
        Default Scheme
      </Dropdown.Item>
      <Dropdown.Item
        active={reaction.gaseous}
        onClick={() => onSchemeChange('gaseous')}
      >
        Gas Scheme
      </Dropdown.Item>
      <Dropdown.Item
        active={reaction.weight_percentage}
        onClick={() => onSchemeChange('weight_percentage')}
      >
        Weight Percentage Scheme
      </Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown>
));

const GenerateReportButton = ({ reaction }) => (
  <OverlayTrigger overlay={<Tooltip id="generateReport">Generate Report</Tooltip>}>
    <Button
      variant="secondary"
      size="sm"
      disabled={reaction.changed || reaction.isNew}
      title={
        reaction.changed || reaction.isNew
          ? 'Report can be generated after reaction is saved.'
          : 'Generate report for this reaction'
      }
      onClick={() => Utils.downloadFile({
        contents: `/api/v1/reports/docx?id=${reaction.id}`,
        name: reaction.name,
      })}
    >
      <i className="fa fa-cogs" />
    </Button>
  </OverlayTrigger>
);

const ProductAnalysesTabs = ({
  reaction, activeAnalysisTab, onSelectTab, onProductChange, onSubmit, onReactionChange,
}) => {
  const productTabs = reaction.products.map((product, key) => {
    const active = key.toString() === activeAnalysisTab;
    return (
      <Tab
        key={product.id}
        eventKey={key}
        title={<ProductLink product={product} active={active} />}
      >
        <SampleDetailsContainers
          sample={product}
          setState={() => onProductChange(product)}
          handleSampleChanged={(_, cb) => onProductChange(product, cb)}
          handleSubmit={onSubmit}
        />
      </Tab>
    );
  });

  const reactionTabTitle = (
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
        onSelect={onSelectTab}
      >
        {productTabs}
        <Tab eventKey={4.1} title={reactionTabTitle}>
          <ReactionDetailsContainers
            reaction={reaction}
            readOnly={!permitOn(reaction)}
            handleSubmit={onSubmit}
            handleReactionChange={onReactionChange}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

// ---------- main component ----------

const ReactionDetails = ({ reaction: propReaction, openedFromCollectionId }) => {
  // Initial UI + user state captured once at mount (class constructor behavior).
  const initialUI = useRef(null);
  if (initialUI.current === null) {
    const ui = UIStore.getState();
    initialUI.current = {
      activeTab: ui.reaction.activeTab,
      activeAnalysisTab: ui.reaction.activeAnalysisTab,
      sfn: ui.hasSfn,
    };
  }
  const currentUserRef = useRef(null);
  if (currentUserRef.current === null) {
    const userState = UserStore.getState();
    currentUserRef.current = (userState && userState.currentUser) || {};
  }

  // Reaction state via reducer so that dispatches with the same mutated object
  // always bump `revision` and force a re-render (class setState({ reaction }) parity).
  const [reactionStore, dispatchReaction] = useReducer(
    reactionReducer,
    { reaction: propReaction, revision: 0 },
  );
  const { reaction } = reactionStore;

  // Rest of UI/local state
  const [activeTab, setActiveTab] = useState(initialUI.current.activeTab);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState(initialUI.current.activeAnalysisTab);
  const [visible, setVisible] = useState(Immutable.List());
  const [sfn] = useState(initialUI.current.sfn);
  const [reactionSvgVersion, setReactionSvgVersion] = useState(0);
  const [isRefreshingGraphic, setIsRefreshingGraphic] = useState(false);
  const [showWtInfoModal, setShowWtInfoModal] = useState(false);
  const [showSchemeChangeConfirm, setShowSchemeChangeConfirm] = useState(false);
  const [pendingSchemeType, setPendingSchemeType] = useState(null);

  // Non-state refs (class instance fields)
  const isUpdatingGraphicRef = useRef(false);
  const pendingGraphicReactionRef = useRef(null);
  const schemeDropdownRef = useRef(null);
  const prevPropReactionRef = useRef(null);
  const prevWeightPercentageRef = useRef(reaction?.weight_percentage);
  const reactionRef = useRef(reaction);
  useEffect(() => { reactionRef.current = reaction; }, [reaction]);

  const setReaction = useCallback((next) => {
    dispatchReaction({ type: 'set', reaction: next });
  }, []);

  // ---------- graphic update (with queue) ----------

  const updateGraphic = useCallback((reactionFromChange) => {
    const target = reactionFromChange || reactionRef.current;

    if (isUpdatingGraphicRef.current) {
      pendingGraphicReactionRef.current = target;
      return;
    }
    isUpdatingGraphicRef.current = true;

    const materialsSvgPaths = buildMaterialsSvgPaths(target);
    const solvents = target.solvents
      .map((s) => s.preferred_label)
      .filter(Boolean);
    const temperature = buildTemperatureDisplayForGraphic(target);

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(
      materialsSvgPaths,
      temperature,
      solvents,
      target.duration,
      target.conditions,
    )
      .then((result) => {
        if (result && result.reaction_svg && result.reaction_svg !== target.reaction_svg_file) {
          target.reaction_svg_file = result.reaction_svg;
          setReaction(target);
        }
      })
      .catch((error) => {
        console.error('Error updating reaction graphic:', error);
      })
      .finally(() => {
        isUpdatingGraphicRef.current = false;
        const pending = pendingGraphicReactionRef.current;
        if (pending) {
          pendingGraphicReactionRef.current = null;
          updateGraphic(pending);
        }
      });
  }, [setReaction]);

  const refreshGraphic = useCallback(() => {
    if (isRefreshingGraphic) return;

    const current = reactionRef.current;
    current.changed = true;
    setReaction(current);
    setIsRefreshingGraphic(true);

    // requestAnimationFrame × 2 to ensure React has committed before firing async work.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const materials = collectRefreshableMaterials(reactionRef.current);
        if (materials.length === 0) {
          // Brief visible feedback even when nothing to refresh.
          setTimeout(() => setIsRefreshingGraphic(false), 400);
          return;
        }

        SamplesFetcher.batchRefreshSvg(materials)
          .then((results) => {
            const failures = results.filter((r) => !r.success);
            if (failures.length > 0) {
              console.warn('Some SVG refreshes failed:', failures);
            }
            // Re-render with current reaction, then refresh the scheme graphic.
            setReaction(reactionRef.current);
            updateGraphic();
          })
          .catch((error) => {
            console.error('Error batch refreshing material SVGs:', error);
            updateGraphic();
          })
          .finally(() => {
            setIsRefreshingGraphic(false);
          });
      });
    });
  }, [isRefreshingGraphic, setReaction, updateGraphic]);

  // ---------- handlers ----------

  const handleReactionChange = useCallback((nextReaction, options = {}) => {
    nextReaction.updateMaxAmountOfProducts();
    nextReaction.changed = true;
    setReaction(nextReaction);
    if (options.updateGraphic && !isUpdatingGraphicRef.current) {
      updateGraphic(nextReaction);
    }
  }, [setReaction, updateGraphic]);

  const handleInputChange = useCallback((type, event) => {
    const value = extractInputValue(type, event);
    const { newReaction, options } = setReactionByType(reactionRef.current, type, value);
    // Keep gas-phase store synchronous for vessel-size changes so gas calculations
    // see the new value during the ensuing render.
    if (VESSEL_SIZE_TYPES.has(type)) {
      syncReactionVesselSizeToStore(newReaction);
    }
    handleReactionChange(newReaction, options);
  }, [handleReactionChange]);

  const handleProductChange = useCallback((product, cb) => {
    const current = reactionRef.current;
    current.updateMaterial(product);
    current.changed = true;
    setReaction(current);
    if (cb) setTimeout(cb, 0);
  }, [setReaction]);

  const handleSubmit = useCallback((closeView = false) => {
    LoadingActions.start();
    const current = reactionRef.current;
    if (current && current.isNew) {
      ElementActions.createReaction(current);
    } else {
      ElementActions.updateReaction(current, closeView);
    }
    if (current.is_new || closeView) {
      DetailActions.close(current, true);
    }
  }, []);

  const handleSelect = useCallback((key) => {
    UIActions.selectTab({ tabKey: key, type: 'reaction' });
    setActiveTab(key);
  }, []);

  const handleSelectActiveAnalysisTab = useCallback((key) => {
    UIActions.selectActiveAnalysisTab(key);
    setActiveAnalysisTab(key);
  }, []);

  const handleSegmentsChange = useCallback((segment) => {
    const current = reactionRef.current;
    const { segments } = current;
    const idx = findIndex(segments, (o) => o.segment_klass_id === segment.segment_klass_id);
    if (idx >= 0) {
      segments.splice(idx, 1, segment);
    } else {
      segments.push(segment);
    }
    current.segments = segments;
    current.changed = true;
    setReaction(current);
  }, [setReaction]);

  const applySchemeChange = useCallback((type) => {
    const current = reactionRef.current;

    if (type === 'default') {
      resetWeightPercentageDependencies(current);
      recalculateEquivalentsForMaterials(current);
      handleInputChange('weight_percentage', false);
      handleInputChange('gaseous', false);
    } else if (type === 'weight_percentage') {
      handleInputChange('weight_percentage', true);
      handleInputChange('gaseous', false);
      assignWeightPercentageReference(current);
    } else if (type === 'gaseous') {
      resetWeightPercentageDependencies(current);
      recalculateEquivalentsForMaterials(current);
      handleInputChange('gaseous', true);
      handleInputChange('weight_percentage', false);
    }
  }, [handleInputChange]);

  const handleReactionSchemeChange = useCallback((type) => {
    const current = reactionRef.current;
    // Switching FROM weight_percentage needs user confirmation.
    if (current.weight_percentage && type !== 'weight_percentage') {
      setShowSchemeChangeConfirm(true);
      setPendingSchemeType(type);
      return;
    }
    applySchemeChange(type);
  }, [applySchemeChange]);

  const confirmSchemeChange = useCallback(() => {
    const type = pendingSchemeType;
    setShowSchemeChangeConfirm(false);
    setPendingSchemeType(null);
    if (type) applySchemeChange(type);
  }, [applySchemeChange, pendingSchemeType]);

  const cancelSchemeChange = useCallback(() => {
    setShowSchemeChangeConfirm(false);
    setPendingSchemeType(null);
  }, []);

  const openWtInfoModal = useCallback(() => setShowWtInfoModal(true), []);
  const closeWtInfoModal = useCallback(() => setShowWtInfoModal(false), []);

  const handleToggleMaterialLabel = useCallback((materialId, isSbmm) => {
    const current = reactionRef.current;
    current.toggleShowLabelForSample(materialId, isSbmm);
    handleReactionChange(current, { updateGraphic: true });
  }, [handleReactionChange]);

  // ---------- effects ----------

  // UIStore subscription (mount/unmount).
  useEffect(() => {
    const handleUIStoreChange = (state) => {
      setActiveTab((prev) => (
        state.reaction.activeTab !== prev ? state.reaction.activeTab : prev
      ));
      setActiveAnalysisTab((prev) => (
        state.reaction.activeAnalysisTab !== prev ? state.reaction.activeAnalysisTab : prev
      ));
    };
    UIStore.listen(handleUIStoreChange);
    return () => UIStore.unlisten(handleUIStoreChange);
  }, []);

  // Initial graphic load + mount-time synchronization (class constructor + componentDidMount).
  useEffect(() => {
    if (!propReaction.reaction_svg_file) {
      updateGraphic(propReaction);
    }
    const timer = setTimeout(() => {
      GasPhaseReactionActions.gaseousReaction(propReaction.gaseous);
      syncReactionVesselSizeToStore(propReaction);
    }, 0);

    if (MatrixCheck(currentUserRef.current.matrix, commentActivation) && !propReaction.isNew) {
      CommentActions.fetchComments(propReaction);
    }
    if (propReaction && propReaction.weight_percentage) {
      syncWeightPercentageReferenceToStore(propReaction);
    }
    return () => clearTimeout(timer);
    // Intentionally mount-only (preserves original componentDidMount semantics).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // componentDidUpdate: react to a new prop reaction, preserving SVG across same-id updates.
  useEffect(() => {
    const prev = prevPropReactionRef.current;
    if (prev !== null && !isEqual(propReaction, prev)) {
      const prevStateReaction = reactionRef.current;
      const isSameReaction = prevStateReaction?.id != null && propReaction?.id === prevStateReaction.id;
      const hasPrevSvg = hasPersistedSvg(prevStateReaction);

      if (isSameReaction && hasPrevSvg) {
        propReaction.reaction_svg_file = prevStateReaction.reaction_svg_file;
        setReaction(propReaction);
        setReactionSvgVersion((v) => v + 1);
      } else {
        setReaction(propReaction);
      }

      if (propReaction && propReaction.weight_percentage) {
        syncWeightPercentageReferenceToStore(propReaction);
      }
      setTimeout(() => syncReactionVesselSizeToStore(propReaction), 0);
    }
    prevPropReactionRef.current = propReaction;
  }, [propReaction, setReaction]);

  // When state-held reaction toggles into weight_percentage, sync the store.
  useEffect(() => {
    const prev = prevWeightPercentageRef.current;
    if (reaction && reaction.weight_percentage && !prev) {
      syncWeightPercentageReferenceToStore(reaction);
    }
    prevWeightPercentageRef.current = reaction?.weight_percentage;
  }, [reaction, reactionStore.revision]);

  // ---------- render ----------

  // Render-time dispatch preserved from the class version to keep gas-phase store
  // in sync with every render. (setTimeout inside defers the actual dispatch.)
  syncReactionVesselSizeToStore(reaction);

  const schemeType = getSchemeType(reaction);
  const schemeDocumentation = getSchemeDocumentation(schemeType);
  const documentationLink = schemeDocumentation?.link;

  const tabContentsMap = {
    scheme: (
      <Tab eventKey="scheme" title="Scheme" key={`scheme_${reaction.id}`}>
        <div className="d-flex align-items-center">
          <SchemeTypeDropdown
            ref={schemeDropdownRef}
            reaction={reaction}
            schemeType={schemeType}
            onSchemeChange={handleReactionSchemeChange}
          />
          <SchemeChangeConfirmOverlay
            show={showSchemeChangeConfirm}
            target={() => schemeDropdownRef.current}
            onConfirm={confirmSchemeChange}
            onCancel={cancelSchemeChange}
          />
          {reaction.weight_percentage && (
            <>
              <WtInfoButton onClick={openWtInfoModal} />
              <SchemeDocumentationButton config={schemeDocumentation} />
            </>
          )}
        </div>
        {!reaction.isNew && <CommentSection section="reaction_scheme" element={reaction} />}
        <ReactionDetailsScheme
          reaction={reaction}
          onReactionChange={handleReactionChange}
          onInputChange={handleInputChange}
        />
      </Tab>
    ),
    properties: (
      <Tab eventKey="properties" title="Properties" key={`properties_${reaction.id}`}>
        {!reaction.isNew && <CommentSection section="reaction_properties" element={reaction} />}
        <ReactionDetailsProperties
          reaction={reaction}
          onReactionChange={handleReactionChange}
          onInputChange={handleInputChange}
          key={reaction.checksum}
        />
      </Tab>
    ),
    references: (
      <Tab eventKey="references" title="References" key={`references_${reaction.id}`}>
        {!reaction.isNew && <CommentSection section="reaction_references" element={reaction} />}
        <DetailsTabLiteratures
          element={reaction}
          literatures={reaction.isNew ? reaction.literatures : null}
          onElementChange={handleReactionChange}
        />
      </Tab>
    ),
    analyses: (
      <Tab eventKey="analyses" title="Analyses" key={`analyses_${reaction.id}`}>
        {!reaction.isNew && <CommentSection section="reaction_analyses" element={reaction} />}
        <ProductAnalysesTabs
          reaction={reaction}
          activeAnalysisTab={activeAnalysisTab}
          onSelectTab={handleSelectActiveAnalysisTab}
          onProductChange={handleProductChange}
          onSubmit={handleSubmit}
          onReactionChange={handleReactionChange}
        />
      </Tab>
    ),
    green_chemistry: (
      <Tab eventKey="green_chemistry" title="Green Chemistry" key={`green_chem_${reaction.id}`}>
        {!reaction.isNew && <CommentSection section="reaction_green_chemistry" element={reaction} />}
        <GreenChemistry reaction={reaction} onReactionChange={handleReactionChange} />
      </Tab>
    ),
    variations: (
      <Tab
        eventKey={REACTION_VARIATIONS_TAB_KEY}
        title="Variations"
        key={`variations_${reaction.id}`}
        unmountOnExit={false}
      >
        <ReactionVariations reaction={reaction} onReactionChange={handleReactionChange} />
      </Tab>
    ),
    history: (
      <Tab eventKey="history" title="History" key={`Versions_Reaction_${reaction.id.toString()}`}>
        <VersionsTable
          type="reactions"
          id={reaction.id}
          element={reaction}
          // VersionsTable's "reaction" branch ignores `parent`; it calls
          // DetailActions.close(element, true) instead. Pass {} to satisfy isRequired prop.
          parent={{}}
          isEdited={reaction.changed}
        />
      </Tab>
    ),
  };

  addSegmentTabs(reaction, handleSegmentsChange, tabContentsMap);

  const tabContents = [];
  visible.forEach((value) => {
    if (tabContentsMap[value]) tabContents.push(tabContentsMap[value]);
  });

  const currentTab = (activeTab !== 0 && activeTab) || visible[0];

  const titleTooltip = formatTimeStampsOfElement(reaction || {});
  const title = reaction.title();

  const titleAppendix = (
    <>
      {!reaction.isNew && !isEmpty(reaction.research_plans) && (
        <ElementResearchPlanLabels
          plans={reaction.research_plans}
          key={reaction.id}
          placement="right"
        />
      )}
      <ElementAnalysesLabels element={reaction} key={`${reaction.id}_analyses`} />
    </>
  );

  const footerToolbar = !reaction.isNew && (
    <ExportSamplesButton type="reaction" id={reaction.id} />
  );

  const showSave = reaction.changed || reaction.isNew;
  const saveDisabled = !permitOn(reaction) || !(reaction.hasMaterials() && reaction.SMGroupValid());

  return (
    <ElementDetailCard
      element={reaction}
      isPendingToSave={reaction.isPendingToSave}
      title={title}
      titleTooltip={titleTooltip}
      titleAppendix={titleAppendix}
      headerToolbar={<GenerateReportButton reaction={reaction} />}
      footerToolbar={footerToolbar}
      onSave={() => handleSubmit()}
      onSaveClose={() => handleSubmit(true)}
      showSave={showSave}
      saveDisabled={saveDisabled}
      showPrintCode
      showCalendar
    >
      <ReactionSchemeGraphic
        key={`reaction-graphic-${reaction.id}-${reactionSvgVersion}`}
        reaction={reaction}
        onToggleLabel={handleToggleMaterialLabel}
        onRefresh={refreshGraphic}
        isRefreshing={isRefreshingGraphic}
      />
      <WeightPercentageInfoModal
        show={showWtInfoModal}
        onHide={closeWtInfoModal}
        documentationLink={documentationLink}
      />
      {sfn && <ScifinderSearch el={reaction} />}
      <div className="tabs-container--with-borders">
        <ElementDetailSortTab
          type="reaction"
          availableTabs={Object.keys(tabContentsMap)}
          onTabPositionChanged={setVisible}
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
        <CommentModal element={reaction} />
      </div>
    </ElementDetailCard>
  );
};

ReactionDetails.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  reaction: PropTypes.object,
  openedFromCollectionId: PropTypes.number,
};

export default ReactionDetails;
