/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-param-reassign */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, InputGroup, ListGroupItem, Tabs, Tab, Row, Col,
  Tooltip, OverlayTrigger, Modal, Alert, Form,
  Accordion, Container
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import { CreatableSelect } from 'src/components/common/Select';
import { cloneDeep, findIndex, set } from 'lodash';
import uuid from 'uuid';
import Immutable from 'immutable';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import QcActions from 'src/stores/alt/actions/QcActions';
import QcStore from 'src/stores/alt/stores/QcStore';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import PubchemLcss from 'src/components/pubchem/PubchemLcss';
import ElementReactionLabels from 'src/apps/mydb/elements/labels/ElementReactionLabels';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';

import StructureEditorModal from 'src/components/structureEditor/StructureEditorModal';

import Sample from 'src/models/Sample';
import PolymerSection from 'src/apps/mydb/elements/details/samples/propertiesTab/PolymerSection';
import ElementalCompositionGroup from 'src/apps/mydb/elements/details/samples/propertiesTab/ElementalCompositionGroup';
import SampleName from 'src/components/common/SampleName';
import ClipboardCopyText from 'src/components/common/ClipboardCopyText';
import SampleForm from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleForm';
import ComputedPropsContainer from 'src/components/computedProps/ComputedPropsContainer';
import ComputedPropLabel from 'src/apps/mydb/elements/labels/ComputedPropLabel';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import QcMain from 'src/apps/mydb/elements/details/samples/qcTab/QcMain';
import ConfirmClose from 'src/components/common/ConfirmClose';
import { EditUserLabels, ShowUserLabels } from 'src/components/UserLabels';
import CopyElementModal from 'src/components/common/CopyElementModal';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import NmrSimTab from 'src/apps/mydb/elements/details/samples/nmrSimTab/NmrSimTab';
import FastInput from 'src/apps/mydb/elements/details/samples/FastInput';
import ScifinderSearch from 'src/components/scifinder/ScifinderSearch';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import MeasurementsTab from 'src/apps/mydb/elements/details/samples/measurementsTab/MeasurementsTab';
import { validateCas } from 'src/utilities/CasValidation';
import ChemicalTab from 'src/components/chemicals/ChemicalTab';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import { commentActivation } from 'src/utilities/CommentHelper';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import { copyToClipboard } from 'src/utilities/clipboard';
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';
import { StoreContext } from 'src/stores/mobx/RootStore';

const MWPrecision = 6;

const decoupleCheck = (sample) => {
  if (!sample.decoupled && sample.molecule && sample.molecule.id === '_none_' && !sample.isMixture()) {
    NotificationActions.add({
      title: 'Error on Sample creation', message: 'The molecule structure is required!', level: 'error', position: 'tc'
    });
    LoadingActions.stop();
    return false;
  }
  if (sample.decoupled && sample.sum_formula?.trim() === '') { sample.sum_formula = 'undefined structure'; }
  if (!sample.decoupled) { sample.sum_formula = ''; }
  return true;
};

const rangeCheck = (field, sample) => {
  if (sample[`${field}_lowerbound`] && sample[`${field}_lowerbound`] !== ''
    && sample[`${field}_upperbound`] && sample[`${field}_upperbound`] !== ''
    && Number.parseFloat(sample[`${field}_upperbound`]) < Number.parseFloat(sample[`${field}_lowerbound`])) {
    NotificationActions.add({
      title: `Error on ${field.replace(/(^\w{1})|(_{1}\w{1})/g, (match) => match.toUpperCase())}`,
      message: 'range lower bound must be less than or equal to range upper',
      level: 'error',
      position: 'tc'
    });
    LoadingActions.stop();
    return false;
  }
  return true;
};

export default class SampleDetails extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);

    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};

    // Check redirectedFromMixture flag in UIStore
    const redirectedFromMixture = UIStore.getState() && UIStore.getState().redirectedFromMixture;

    this.state = {
      sample: props.sample,
      reaction: null,
      materialGroup: null,
      showStructureEditor: false,
      loadingMolecule: false,
      loadingComponentDeletion: false,
      showChemicalIdentifiers: false,
      activeTab: UIStore.getState().sample.activeTab,
      qrCodeSVG: '',
      isCasLoading: false,
      validCas: true,
      showMolfileModal: false,
      trackMolfile: props.sample.molfile,
      smileReadonly: !((typeof props.sample.molecule.inchikey === 'undefined')
        || props.sample.molecule.inchikey == null || props.sample.molecule.inchikey === 'DUMMY'),
      smilesInput: '',
      molfile: props.sample.molfile || '',
      inchiString: props.sample.molecule_inchistring || '',
      quickCreator: false,
      showInchikey: false,
      pageMessage: null,
      visible: Immutable.List(),
      startExport: false,
      sfn: UIStore.getState().hasSfn,
      saveInventoryAction: false,
      isChemicalEdited: false,
      currentUser,
      showRedirectWarning: redirectedFromMixture || false,
      casInputValue: '',
      ketcherSVGError: null
    };

    this.enableComputedProps = MatrixCheck(currentUser.matrix, 'computedProp');
    this.enableSampleDecoupled = MatrixCheck(currentUser.matrix, 'sampleDecoupled');
    this.enableNmrSim = MatrixCheck(currentUser.matrix, 'nmrSim');

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.isCASNumberValid = this.isCASNumberValid.bind(this);
    this.handleMolfileShow = this.handleMolfileShow.bind(this);
    this.handleMolfileClose = this.handleMolfileClose.bind(this);
    this.handleSampleChanged = this.handleSampleChanged.bind(this);
    this.handleAmountChanged = this.handleAmountChanged.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.toggleInchi = this.toggleInchi.bind(this);
    this.fetchQcWhenNeeded = this.fetchQcWhenNeeded.bind(this);
    this.customizableField = this.customizableField.bind(this);
    this.decoupleMolecule = this.decoupleMolecule.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    this.decoupleChanged = this.decoupleChanged.bind(this);
    this.handleFastInput = this.handleFastInput.bind(this);
    this.matchSelectedCollection = this.matchSelectedCollection.bind(this);
    this.showStructureEditor = this.showStructureEditor.bind(this);

    this.handleStructureEditorSave = this.handleStructureEditorSave.bind(this);
    this.handleStructureEditorCancel = this.handleStructureEditorCancel.bind(this);
    this.splitSmiles = this.splitSmiles.bind(this);
    this.setComponentDeletionLoading = this.setComponentDeletionLoading.bind(this);
  }

  componentDidMount() {
    const { sample } = this.props;
    const { currentUser, showRedirectWarning } = this.state;

    UIStore.listen(this.onUIStoreChange);

    const { activeTab } = this.state;
    this.fetchQcWhenNeeded(activeTab);

    if (MatrixCheck(currentUser.matrix, commentActivation) && !sample.isNew) {
      CommentActions.fetchComments(sample);
    }

    if (showRedirectWarning) {
      // Use setTimeout to defer dispatch and avoid dispatch-in-dispatch errors in Alt/Flux
      setTimeout(() => {
        UIActions.setRedirectedFromMixture(false);
      }, 0);
    }
  }

  componentDidUpdate(prevProps) {
    const { sample } = this.props;
    if (sample === prevProps.sample) { return };

    const smileReadonly = !(
      (sample.isNew
        && (typeof (sample.molfile) === 'undefined'
          || (sample.molfile || '').length === 0)
      )
      || (typeof (sample.molfile) !== 'undefined' && sample.molecule.inchikey === 'DUMMY')
    );

    // Sync casInputValue when CAS changes
    const currentCas = sample.xref?.cas ?? '';

    this.setState({
      sample,
      smileReadonly,
      loadingMolecule: false,
      isCasLoading: false,
      casInputValue: currentCas,
    });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  handleMolfileShow() {
    this.setState({
      showMolfileModal: true
    });
  }

  handleMolfileClose() {
    this.setState({
      showMolfileModal: false
    });
  }

  handleSampleChanged(sample, cb) {
    this.setState({
      sample,
    }, () => {
      if (typeof cb === 'function') {
        cb();
      }
    });
  }

  handleAmountChanged(amount) {
    const { sample } = this.state;
    sample.setAmountAndNormalizeToGram(amount);
    this.setState({ sample });
  }

  handleFastInput(smi, cas) {
    this.setState({ showChemicalIdentifiers: true, smilesInput: smi }, () => {
      this.handleMoleculeBySmile(cas);
    });
  }

  handleMoleculeBySmile(cas) {
    const { sample, smilesInput } = this.state;
    // const casObj = {};
    MoleculesFetcher.fetchBySmi(smilesInput)
      .then((result) => {
        if (!result || result == null) {
          NotificationActions.add({
            title: 'Error on Sample creation',
            message: `Cannot create molecule with entered Smiles/CAS! [${smilesInput}]`,
            level: 'error',
            position: 'tc'
          });
        } else {
          sample.molfile = result.molfile;
          sample.molecule_id = result.id;
          sample.molecule = result;
          sample.xref = { ...sample.xref, cas };
          this.setState({
            molfile: result.molfile,
            inchiString: result.inchistring,
            quickCreator: true,
            sample,
            smileReadonly: true,
            pageMessage: result.ob_log
          });
          ElementActions.refreshElements('sample');
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      }).finally(() => LoadingActions.stop());
  }

  handleInventorySample(e) {
    const { sample, visible } = this.state;
    sample.inventory_sample = e.target.checked;
    this.handleSampleChanged(sample);

    if (e.target.checked) {
      // Add 'inventory' to visible tabs if not already present
      if (!visible.includes('inventory')) {
        this.setState({ visible: visible.push('inventory') });
      }
      // Persist inventory tab in collection layout if not already present
      this.persistInventoryTabInCollection();
    } else {
      // Remove 'inventory' from visible tabs
      this.setState({
        visible: visible.filter((v) => v !== 'inventory'),
      });
      // switch to properties tab if current tab is inventory tab
      if (this.state.activeTab === 'inventory') {
        this.setState({
          activeTab: 'properties'
        });
      }
    }
  }

  handleStructureEditorSave(molfile, svg, info, editorId) {
    const { sample } = this.state;
    sample.molfile = molfile;
    const svgFile = svg; // SVG is passed as 4th parameter
    const editor = editorId || 'ketcher'; // editorId is passed as 6th parameter
    const config = info; // info might contain config data like smiles
    const smiles = (config && sample.molecule) ? config.smiles : null;
    sample.contains_residues = molfile?.indexOf(' R# ') > -1;
    sample.formulaChanged = true;
    this.setState({ loadingMolecule: true });

    const fetchError = (errorMessage) => {
      NotificationActions.add({
        title: 'Error on Sample creation',
        message: `Cannot create molecule! Error: [${errorMessage}]`,
        level: 'error',
        position: 'tc'
      });
      this.setState({ loadingMolecule: false });
    };

    const fetchSuccess = (result) => {
      if (!result || result == null) {
        throw new Error('No molecule returned!');
      }
      sample.molecule = result;
      sample.molecule_id = result.id;
      if (result.inchikey === 'DUMMY') { sample.decoupled = true; }

      // Handle temporary SVG file from structure editor
      if (result.temp_svg) {
        // For mixture samples, clear any existing sample_svg_file to preserve combined molecule SVG
        // This ensures the combined molecule SVG is always displayed
        if (sample.isMixture()) {
          sample.sample_svg_file = null;
        } else {
          sample.sample_svg_file = result.temp_svg;
        }
      }

      this.setState({
        sample,
        smileReadonly: true,
        pageMessage: result.ob_log,
        loadingMolecule: false
      });
    };

    const fetchMolecule = (fetchFunction) => {
      fetchFunction()
        .then(fetchSuccess).catch(fetchError).finally(() => {
          this.splitSmiles(editor, svgFile);
          this.hideStructureEditor();
        });
    };

    if (!smiles || smiles === '') {
      fetchMolecule(
        () => MoleculesFetcher.fetchByMolfile(molfile, svgFile, editor, sample.decoupled)
      );
    } else {
      fetchMolecule(() => MoleculesFetcher.fetchBySmi(smiles, svgFile, molfile, editor));
    }
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor();
  }

  handleSubmit(closeView = false) {
    const { currentCollection } = UIStore.getState();
    LoadingActions.start.defer();
    const { sample, validCas } = this.state;
    if (this.matchSelectedCollection(currentCollection) && sample.inventory_label !== undefined) {
      sample.collection_id = currentCollection.id;
    }
    this.checkMolfileChange();
    if (!validCas) {
      sample.xref = { ...sample.xref, cas: '' };
    }
    if (!decoupleCheck(sample)) return;
    if (!rangeCheck('boiling_point', sample)) return;
    if (!rangeCheck('melting_point', sample)) return;

    // Prepare mixture samples for saving using Sample.js method
    sample.prepareMixtureForSave();

    if (sample.belongTo && sample.belongTo.type === 'reaction') {
      const reaction = sample.belongTo;
      reaction.editedSample = sample;
      const materialGroup = sample.matGroup;
      if (sample.isNew) {
        ElementActions.createSampleForReaction(sample, reaction, materialGroup);
      } else {
        ElementActions.updateSampleForReaction(sample, reaction, closeView);
      }
    } else if (sample.belongTo && sample.belongTo.type === 'wellplate') {
      const wellplate = sample.belongTo;
      ElementActions.updateSampleForWellplate(sample, wellplate);
    } else if (sample.isNew) {
      ElementActions.createSample(sample, closeView);
    } else {
      sample.cleanBoilingMelting();
      ElementActions.updateSample(new Sample(sample), closeView);
    }

    if (sample.is_new || closeView) {
      DetailActions.close(sample, true);
    }
    sample.updateChecksum();
    this.setState({ validCas: true, trackMolfile: sample.molfile });
  }

  handleSegmentsChange(se) {
    const { sample } = this.state;
    const { segments } = sample;
    const idx = findIndex(segments, (o) => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    sample.segments = segments;
    this.setState({ sample });
  }

  handleSubmitInventory() {
    this.setState({ saveInventoryAction: true });
  }

  handleExportAnalyses(sample) {
    this.setState({ startExport: true });
    AttachmentFetcher.downloadZipBySample(sample.id)
      .then(() => { this.setState({ startExport: false }); })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  handleSelect(eventKey) {
    UIActions.selectTab({ tabKey: eventKey, type: 'sample' });
    this.fetchQcWhenNeeded(eventKey);
  }

  onCasSelectOpen(casArr) {
    const { sample } = this.state;
    if (casArr.length === 0) {
      this.setState({ isCasLoading: true });
      DetailActions.getMoleculeCas(sample);
    }
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  onUIStoreChange(state) {
    if (state.sample.activeTab !== this.state.activeTab) {
      this.setState((previousState) => ({
        ...previousState, activeTab: state.sample.activeTab
      }));
    }
  }

  /* eslint-disable camelcase */

  sampleFooter() {
    const { sample, startExport } = this.state;
    const belongToReaction = sample.belongTo && sample.belongTo.type === 'reaction';
    const hasAnalyses = !!(sample.analyses && sample.analyses.length > 0);

    return (
      <>
        <Button variant="primary" onClick={() => DetailActions.close(sample)}>
          Close
        </Button>
        {this.saveBtn(sample)}
        {!sample.isNew && belongToReaction && this.saveBtn(sample, true)}
        {!sample.isNew && hasAnalyses && (
          <Button
            variant="info"
            disabled={!this.sampleIsValid()}
            onClick={() => this.handleExportAnalyses(sample)}
          >
            Download Analysis
            {startExport && <i className="fa fa-spin fa-spinner ms-1" />}
          </Button>
        )}
      </>
    );
  }

  onSVGStructureError = (errorMessage) => {
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
    }
    this.setState({ ketcherSVGError: errorMessage });
    this.errorTimer = setTimeout(() => {
      this.setState({ ketcherSVGError: null });
      this.errorTimer = null;
    }, 5000);
  };

  structureEditorModal(sample) {
    const { molfile } = sample;
    const hasParent = sample && sample.parent_id;
    const hasChildren = sample && sample.children_count > 0;
    return (
      <StructureEditorModal
        key={sample.id}
        showModal={this.state.showStructureEditor}
        onSave={this.handleStructureEditorSave}
        onCancel={this.handleStructureEditorCancel}
        molfile={molfile}
        hasParent={hasParent}
        hasChildren={hasChildren}
        sample={sample}
        onSVGStructureError={this.onSVGStructureError}
      />
    );
  }

  saveSampleOrInventory(closeView) {
    const { activeTab, sample } = this.state;
    if (activeTab === 'inventory' && sample.inventory_sample) {
      this.handleSubmitInventory();
    } else {
      this.handleSubmit(closeView);
    }
  }

  editChemical = (boolean) => {
    this.setState({ isChemicalEdited: boolean });
  };

  /**
   * Persists the inventory tab into the current collection's tabs_segment
   * and the user profile layout so it survives sample save/refresh.
   * Only acts when the collection's sample layout does not already include
   * the inventory tab; no-op for sync-to-me collections.
   */
  persistInventoryTabInCollection() {
    const { currentCollection } = UIStore.getState();
    if (!currentCollection || currentCollection.is_sync_to_me) return;

    const sampleLayout = currentCollection?.tabs_segment?.sample;

    // If the collection already tracks the inventory tab, nothing to do
    if (sampleLayout && Object.prototype.hasOwnProperty.call(sampleLayout, 'inventory') && sampleLayout?.inventory > 0) {
      return;
    } 

    // Resolve the effective layout: collection -> user profile -> fallback
    const userProfile = UserStore.getState().profile;
    const baseLayout = sampleLayout
      || userProfile?.data?.layout_detail_sample;

    if (!baseLayout) return;

    // Append inventory as the next visible tab
    const maxOrder = Math.max(0, ...Object.values(baseLayout).map((v) => Math.abs(v)));
    const updatedLayout = { ...baseLayout, inventory: maxOrder + 1 };

    // Persist to collection tabs_segment
    const tabSegment = { ...currentCollection?.tabs_segment, sample: updatedLayout };
    this.context.collections.updateCollection(currentCollection, tabSegment);

    if (!userProfile) return;
    // Persist to user profile
    set(userProfile, 'data.layout_detail_sample', updatedLayout);
    UserActions.updateUserProfile(userProfile);
  }

  matchSelectedCollection(currentCollection) {
    const { sample } = this.props;
    if (sample.isNew) {
      return true;
    }
    const collection_labels = sample.tag?.taggable_data?.collection_labels || [];
    const result = collection_labels.filter((object) => object.id === currentCollection.id).length > 0;
    return result;
  }

  sampleInventoryTab(ind) {
    const { sample } = this.state;
    const { saveInventoryAction } = this.state;

    return (
      <Tab eventKey={ind} title="Inventory" key={`Inventory${sample.id.toString()}`}>
        {
          !sample.isNew && <CommentSection section="sample_inventory" element={sample} />
        }
        <ListGroupItem>
          <ChemicalTab
            sample={sample}
            handleUpdateSample={(s) => this.setState({ sample: s })}
            setSaveInventory={(v) => this.setState({ saveInventoryAction: v })}
            saveInventory={saveInventoryAction}
            editChemical={this.editChemical}
            key={`ChemicalTab${sample.id.toString()}`}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  sampleContainerTab(ind) {
    const { sample } = this.state;
    return (
      <Tab eventKey={ind} title="Analyses" key={`Container${sample.id.toString()}`}>
        {
          !sample.isNew && <CommentSection section="sample_analyses" element={sample} />
        }
        <ListGroupItem className="pb-4">
          <SampleDetailsContainers
            sample={sample}
            setState={(newSample) => { this.setState(newSample); }}
            handleSampleChanged={this.handleSampleChanged}
            handleSubmit={this.handleSubmit}
            fromSample
          />
        </ListGroupItem>
      </Tab>
    );
  }

  sampleLiteratureTab() {
    const { sample } = this.state;
    if (!sample) { return null; }
    return (
      <Tab
        eventKey="references"
        title="References"
        key={`References_${sample.id}`}
      >
        {
          !sample.isNew && <CommentSection section="sample_references" element={sample} />
        }
        <DetailsTabLiteratures
          element={sample}
          literatures={sample.isNew ? sample.literatures : null}
        />
      </Tab>
    );
  }

  sampleImportReadoutTab(ind) {
    const { sample } = this.state;
    return (
      <Tab
        eventKey={ind}
        title="Results"
        key={`Results${sample.id.toString()}`}
      >
        {
          !sample.isNew && <CommentSection section="sample_results" element={sample} />
        }
        <Form.Group controlId="importedReadoutInput">
          <Form.Label>Imported readout</Form.Label>
          <InputGroup>
            <Form.Control
              type="text"
              value={sample.imported_readout || ''}
              disabled
              readOnly
            />
          </InputGroup>
        </Form.Group>
      </Tab>
    );
  }

  measurementsTab(index) {
    const { sample } = this.state;

    return (
      <Tab
        eventKey={index}
        title="Measurements"
        key={`Measurements${sample.id.toString()}`}
      >
        <MeasurementsTab sample={sample} />
      </Tab>
    );
  }

  versioningTable(index) {
    const { sample } = this.state;

    return (
      <Tab
        eventKey={index}
        title="History"
        key={`History_Sample_${sample.id.toString()}`}
      >
        <ListGroupItem>
          <VersionsTable
            type="samples"
            id={sample.id}
            element={sample}
            parent={this}
            isEdited={sample.isEdited}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  moleculeComputedProps(ind) {
    const { sample } = this.state;
    const key = `computed_props_${sample.id.toString()}`;
    if (!this.enableComputedProps) return <span key={key} />;

    const title = (
      <span>
        <ComputedPropLabel cprops={sample.molecule_computed_props} />
        Computed Properties
      </span>
    );

    return (
      <Tab
        eventKey={ind}
        title={title}
        key={key}
      >
        <ComputedPropsContainer sample={sample} />
      </Tab>
    );
  }

  fetchQcWhenNeeded(key) {
    if (key !== 'qc_curation') return;
    const { infers } = QcStore.getState();
    const { sample } = this.state;
    let isInStore = false;
    infers.forEach((i) => {
      if (i.sId === sample.id) isInStore = true;
    });
    if (isInStore) return;
    QcActions.setLoading.defer();
    QcActions.loadInfers.defer({ sample });
  }

  qualityCheckTab(ind) {
    const { sample } = this.state;
    if (!sample) { return null; }
    return (
      <Tab
        eventKey={ind}
        title="QC & curation"
        key={`QC_${sample.id}_${ind}`}
      >
        {
          !sample.isNew && <CommentSection section="sample_qc_curation" element={sample} />
        }
        <QcMain
          sample={sample}
        />
      </Tab>
    );
  }

  nmrSimTab(ind) {
    const { sample } = this.state;
    if (!sample) { return null; }
    return (
      <Tab
        eventKey={ind}
        title="NMR Simulation"
        key={`NMR_${sample.id}_${ind}`}
      >
        <NmrSimTab
          sample={sample}
        />
      </Tab>
    );
  }

  sampleIsValid() {
    const { sample, loadingMolecule, quickCreator } = this.state;
    return (sample.isValid && !loadingMolecule) || sample.is_scoped == true || quickCreator;
  }

  saveBtn(sample, closeView = false) {
    let submitLabel = (sample && sample.isNew) ? 'Create' : 'Save';
    const hasComponents = !sample.isMixture() || (sample.hasComponents());
    const isDisabled = !sample.can_update || !hasComponents;
    if (closeView) submitLabel += ' and close';

    return (
      <Button
        id="submit-sample-btn"
        variant="warning"
        onClick={() => this.saveSampleOrInventory(closeView)}
        disabled={!this.sampleIsValid() || isDisabled}
      >
        {submitLabel}
      </Button>
    );
  }

  elementalPropertiesItem(sample) {
    // avoid empty ListGroupItem
    if (!sample.molecule_formula || sample.isMixture()) {
      return false;
    }

    const label = sample.contains_residues
      ? 'Polymer section / Elemental composition'
      : 'Elemental composition';

    const { materialGroup } = this.state;

    return (
      <Accordion className="polymer-section">
        <Accordion.Item eventKey="elemental-comp">
          <Accordion.Header>{label}</Accordion.Header>
          <Accordion.Body>
            {sample.contains_residues ? (
              <PolymerSection
                sample={sample}
                handleAmountChanged={this.handleAmountChanged}
                handleSampleChanged={this.handleSampleChanged}
                materialGroup={materialGroup}
              />
            ) : (
              <ElementalCompositionGroup
                handleSampleChanged={this.handleSampleChanged}
                sample={sample}
              />
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    );
  }

  chemicalIdentifiersItem(sample) {
    const { showChemicalIdentifiers } = this.state;
    const paneKey = 'chem-identifiers';

    return (
      <Accordion
        className="chem-identifiers-section mb-2"
        activeKey={showChemicalIdentifiers && paneKey}
        onSelect={(key) => this.setState({ showChemicalIdentifiers: key === paneKey })}
      >
        <Accordion.Item eventKey={paneKey}>
          <Accordion.Header>
            Chemical identifiers
            {sample.decoupled && <span className="text-danger ms-1">[decoupled]</span>}
          </Accordion.Header>
          <Accordion.Body>
            {this.moleculeInchi(sample)}
            {this.moleculeCanoSmiles(sample)}
            {this.moleculeMolfile(sample)}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    );
  }

  samplePropertiesTab(ind) {
    const { sample } = this.state;

    return (
      <Tab eventKey={ind} title="Properties" key={`Props${sample.id.toString()}`}>
        {!sample.isNew && <CommentSection section="sample_properties" element={sample} />}
        <SampleForm
          sample={sample}
          handleSampleChanged={this.handleSampleChanged}
          showStructureEditor={this.showStructureEditor}
          customizableField={this.customizableField}
          enableSampleDecoupled={this.enableSampleDecoupled}
          decoupleMolecule={this.decoupleMolecule}
          setComponentDeletionLoading={this.setComponentDeletionLoading}
        />
        <div className="mb-2">
          {this.chemicalIdentifiersItem(sample)}
          {sample.molecule_formula && (
            this.elementalPropertiesItem(sample)
          )}
        </div>
        <EditUserLabels element={sample} fnCb={this.handleSampleChanged} />
        <div className="mt-2">
          <PrivateNoteElement element={sample} disabled={!sample.can_update} />
        </div>
      </Tab>
    );
  }

  customizableField() {
    const { xref } = this.state.sample;
    const {
      cas,
      optical_rotation,
      rfvalue,
      rfsovents,
      supplier,
      private_notes,
      ...customKeys
    } = cloneDeep(xref || {});
    const check = ['form', 'solubility', 'refractive_index', 'flash_point', 'inventory_label'];

    if (Object.keys(customKeys).length === 0
      || check.some((key) => Object.keys(customKeys).includes(key))) return null;
    return (
      Object.keys(customKeys).map((key) => (
        <tr key={`field_${key}`}>
          <td colSpan="4">
            <Form.Group>
              <Form.Label>{key}</Form.Label>
              <Form.Control type="text" defaultValue={customKeys[key] || ''} onChange={(e) => this.updateKey(key, e)} />
            </Form.Group>
          </td>
        </tr>
      ))
    );
  }

  updateKey(key, e) {
    const { sample } = this.state;
    sample.xref[key] = e.target.value;
    this.setState({ sample });
  }

  moleculeCas() {
    const { sample, isCasLoading, validCas } = this.state;
    const { molecule, xref } = sample;
    const cas = xref?.cas ?? '';
    let casArr = Array.isArray(molecule?.cas) ? molecule?.cas?.filter((el) => el !== null) : [];
    if (cas && !casArr.includes(cas)) {
      casArr.push(cas);
    }
    const errorMessage = <span className="text-danger">Cas number is invalid</span>;
    const options = casArr.map((element) => ({ label: element, value: element }));

    return (
      <div className="my-4">
        <InputGroup>
          <div className="d-flex flex-grow-1">
            <InputGroup.Text>CAS</InputGroup.Text>
            <CreatableSelect
              name="cas"
              isClearable
              isInputEditable
              inputValue={this.state.casInputValue}
              options={options}
              onChange={(selectedOption) => {
                if (selectedOption) {
                  const value = selectedOption.value;
                  this.setState({ casInputValue: value });
                  this.updateCas(selectedOption);
                } else {
                  this.setState({ casInputValue: '' });
                  this.updateCas(null);
                }
              }}
              onInputChange={(inputValue, { action }) => {
                if (action === 'input-change' || action === 'set-value') {
                  this.setState({ casInputValue: inputValue });
                }
              }}
              onFocus={() => {
                const currentCas = cas || '';
                this.setState({ casInputValue: currentCas });
              }}
              onMenuOpen={() => this.onCasSelectOpen(casArr)}
              isLoading={isCasLoading}
              value={options.find(({ value }) => value === cas) || null}
              onBlur={() => this.isCASNumberValid(cas || '', true)}
              isDisabled={!sample.can_update}
              className="flex-grow-1"
              placeholder="Select or enter CAS number"
              allowCreateWhileLoading
              formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
            />
            <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
              <Button
                variant="light"
                onClick={() => copyToClipboard(cas)}
              >
                <i className="fa fa-clipboard" />
              </Button>
            </OverlayTrigger>
          </div>
        </InputGroup>
        {!validCas && errorMessage}
      </div>
    );
  }

  isCASNumberValid(cas, boolean) {
    const { sample } = this.state;
    const result = validateCas(cas, boolean);
    if (result !== false) {
      sample.xref = { ...sample.xref, cas: result };
      this.setState({ sample, validCas: result });
    } else {
      this.setState({ validCas: result });
    }
  }

  updateCas(e) {
    const { sample } = this.state;
    const value = e?.value ?? '';
    sample.xref = { ...sample.xref, cas: value };
    this.setState({ sample });
  }

  saveButton(sampleUpdateCondition, floppyTag, timesTag, boolean = false) {
    return (
      <Button
        variant="warning"
        size="xxsm"
        onClick={() => this.saveSampleOrInventory(boolean)}
        disabled={sampleUpdateCondition}
      >
        {floppyTag}
        {timesTag || null}
      </Button>
    );
  }

  saveAndCloseSample(sample, saveBtnDisplay) {
    const { activeTab, isChemicalEdited } = this.state;
    const isChemicalTab = activeTab === 'inventory';
    const floppyTag = (
      <i className="fa fa-floppy-o" />
    );
    const timesTag = (
      <i className="fa fa-times" />
    );
    const hasComponents = !sample.isMixture() || sample.hasComponents();
    const sampleUpdateCondition = !this.sampleIsValid() || !sample.can_update || !hasComponents;

    const elementToSave = activeTab === 'inventory' ? 'Chemical' : 'Sample';
    const saveAndClose = (saveBtnDisplay
      && (
        <OverlayTrigger
          placement="bottom"
          overlay={(
            <Tooltip id="saveCloseSample">
              {`Save and Close ${elementToSave}`}
            </Tooltip>
          )}
        >
          {this.saveButton(sampleUpdateCondition, floppyTag, timesTag, true)}
        </OverlayTrigger>
      )
    );
    const save = (saveBtnDisplay
      && (
        <OverlayTrigger
          placement="bottom"
          overlay={(
            <Tooltip id="saveSample">
              {`Save ${elementToSave}`}
            </Tooltip>
          )}
        >
          {this.saveButton(sampleUpdateCondition, floppyTag)}
        </OverlayTrigger>
      )
    );

    const saveForChemical = isChemicalTab && isChemicalEdited ? save : null;
    return (
      <>
        {isChemicalTab ? saveForChemical : save}
        {isChemicalTab ? null : saveAndClose}
        <ConfirmClose el={sample} />
      </>
    );
  }

  sampleHeader(sample) {
    const { isChemicalEdited, activeTab } = this.state;
    const titleTooltip = formatTimeStampsOfElement(sample || {});
    const isChemicalTab = activeTab === 'inventory';
    const saveBtnDisplay = sample.isEdited || (isChemicalEdited && isChemicalTab);

    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;

    const copyBtn = (sample.can_copy && !sample.isNew) ? (
      <CopyElementModal
        element={sample}
        defCol={defCol}
      />
    ) : null;

    const inventorySample = (
      <Form.Check
        type="checkbox"
        id="sample-inventory-header"
        className="mx-2 sample-inventory-header"
        checked={sample.inventory_sample}
        onChange={(e) => this.handleInventorySample(e)}
        label="Inventory"
      />
    );

    const decoupleCb = sample.can_update && this.enableSampleDecoupled ? (
      <Form.Check
        type="checkbox"
        id="sample-header-decouple"
        className="mx-2 sample-header-decouple"
        checked={sample.decoupled}
        onChange={(e) => this.decoupleChanged(e)}
        label="Decoupled"
      />
    ) : null;

    const inventoryLabel = sample.inventory_sample && sample.inventory_label ? sample.inventory_label : null;

    const { pageMessage } = this.state;
    const messageBlock = (pageMessage
      && (pageMessage.error.length > 0 || pageMessage.warning.length > 0)) ? (
      <Alert variant="warning" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
        <strong>Structure Alert</strong>
        <Button
          size="sm"
          variant="outline-warning"
          style={{ float: 'right' }}
          onClick={() => this.setState({ pageMessage: null })}
        >
          Close Alert
        </Button>
        {
          pageMessage.error.map((m) => (
            <div key={uuid.v1()}>{m}</div>
          ))
        }
        {
          pageMessage.warning.map((m) => (
            <div key={uuid.v1()}>{m}</div>
          ))
        }
      </Alert>
    ) : null;

    // warning message for redirection
    const redirectWarningBlock = this.state.showRedirectWarning ? (
      <Alert variant="warning" className="d-flex flex-column gap-2 mt-2 mb-0 p-2">
        <div>
          <strong>Notice:</strong>
          <p className="mb-1">
            You are viewing the original sample that was used to create this component. Some of its attributes may have
            changed now.
          </p>
          <p className="mb-0">
            Any updates you make here will apply only to the original sample, not to any component generated from it.
            However, changes on this sample may affect other dependant entities.
          </p>
        </div>
        <div className="align-self-end">
          <Button
            size="sm"
            variant="outline-warning"
            onClick={() => this.setState({ showRedirectWarning: false })}
          >
            Close Alert
          </Button>
        </div>
      </Alert>
    ) : null;

    return (
      <>
        <div className="d-flex align-items-center flex-wrap">
          <div className="d-flex align-items-center flex-wrap flex-grow-1 gap-2">
            <OverlayTrigger placement="bottom" overlay={<Tooltip id="sampleDates">{titleTooltip}</Tooltip>}>
              <span className="flex-shrink-0">
                <i className="icon-sample me-1" />
                {inventoryLabel || sample.title()}
              </span>
            </OverlayTrigger>
            <ShowUserLabels element={sample} />
            <ElementAnalysesLabels element={sample} key={`${sample.id}_analyses`} />
            {!sample.isNew && <ElementCollectionLabels element={sample} key={sample.id} placement="right" />}
            <ElementReactionLabels element={sample} key={`${sample.id}_reactions`} />
            <PubchemLabels element={sample} />
            <HeaderCommentSection element={sample} />
            {sample.isNew && !sample.isMixture() && <FastInput fnHandle={this.handleFastInput} />}
          </div>
          <div className="d-flex align-items-center gap-2">
            {decoupleCb}
            {inventorySample}
            {!sample.isNew && <OpenCalendarButton isPanelHeader eventableId={sample.id} eventableType="Sample" />}
            <PrintCodeButton element={sample} />
            {copyBtn}
            {this.saveAndCloseSample(sample, saveBtnDisplay)}
          </div>
        </div>
        {messageBlock}
        {redirectWarningBlock}
      </>
    );
  }

  sampleInfo(sample) {
    const isMixture = sample.isMixture();
    let pubchemLcss = (sample.pubchem_tag && sample.pubchem_tag.pubchem_lcss
      && sample.pubchem_tag.pubchem_lcss.Record) || null;
    if (pubchemLcss && pubchemLcss.Reference) {
      const echa = pubchemLcss.Reference.filter((e) => e.SourceName
        === 'European Chemicals Agency (ECHA)').map((e) => e.ReferenceNumber);
      if (echa.length > 0) {
        pubchemLcss = pubchemLcss.Section.find((e) => e.TOCHeading === 'Safety and Hazards') || [];
        pubchemLcss = pubchemLcss.Section.find((e) => e.TOCHeading === 'Hazards Identification') || [];
        pubchemLcss = pubchemLcss.Section[0].Information.filter((e) => echa.includes(e.ReferenceNumber)) || null;
      } else pubchemLcss = null;
    }
    const pubchemCid = sample.pubchem_tag && sample.pubchem_tag.pubchem_cid
      ? sample.pubchem_tag.pubchem_cid : 0;
    const lcssSign = pubchemLcss && !sample.decoupled
      ? <PubchemLcss cid={pubchemCid} informArray={pubchemLcss} /> : null;

    return (
      <Container>
        <Row className="mb-4">
          <Col md={4}>
            <h4><SampleName sample={sample} /></h4>
            {!isMixture && (
              <>
                <h5>{this.sampleAverageMW(sample)}</h5>
                <h5>{this.sampleExactMW(sample)}</h5>
              </>
            )}
            {sample.isNew || isMixture ? null : <h6>{this.moleculeCas()}</h6>}
            {lcssSign}
          </Col>
          <Col md={8} className="position-relative">
            {this.svgOrLoading(sample)}
          </Col>
        </Row>
      </Container>
    );
  }

  moleculeInchi(sample) {
    const inchiLabel = this.state.showInchikey ? 'InChIKey' : 'InChI';
    const inchiTooltip = <Tooltip id="inchi_tooltip">toggle InChI/InChIKey</Tooltip>;

    return (
      <InputGroup className="mb-3">
        <OverlayTrigger placement="top" overlay={inchiTooltip}>
          <Button
            variant="light"
            onClick={this.toggleInchi}
          >
            {inchiLabel}
          </Button>
        </OverlayTrigger>
        <Form.Control
          type="text"
          key={sample.id}
          value={(this.state.showInchikey ? sample.molecule_inchikey : this.state.inchiString) || ''}
          disabled
          readOnly
        />
        <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
          <Button
            variant="light"
            onClick={() => copyToClipboard(
              (this.state.showInchikey
                ? sample.molecule_inchikey
                : this.state.inchiString)
              || ' '
            )}
          >
            <i className="fa fa-clipboard" />
          </Button>
        </OverlayTrigger>
      </InputGroup>
    );
  }

  clipboardTooltip() {
    return (
      <Tooltip id="assign_button">copy to clipboard</Tooltip>
    );
  }

  moleculeCreatorTooltip() {
    return (
      <Tooltip id="assign_button">create molecule</Tooltip>
    );
  }

  moleculeCanoSmiles(sample) {
    const { smileReadonly, smilesInput } = this.state;
    return (
      <InputGroup className="mb-3">
        <InputGroup.Text>Canonical Smiles</InputGroup.Text>
        <Form.Control
          type="text"
          value={smileReadonly ? sample.molecule_cano_smiles || '' : smilesInput}
          disabled={smileReadonly}
          readOnly={smileReadonly}
          onChange={(e) => {
            if (!smileReadonly) {
              this.setState({ smilesInput: e.target.value });
            }
          }}
        />
        <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
          <Button
            variant="light"
            onClick={() => copyToClipboard(sample.molecule_cano_smiles || '')}
          >
            <i className="fa fa-clipboard" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={this.moleculeCreatorTooltip()}>
          <Button
            variant="light"
            id="smile-create-molecule"
            disabled={smileReadonly}
            readOnly={smileReadonly}
            onClick={() => this.handleMoleculeBySmile()}
          >
            <i className="fa fa-save" />
          </Button>
        </OverlayTrigger>
      </InputGroup>
    );
  }

  moleculeMolfile(sample) {
    return (
      <InputGroup className="mb-3">
        <InputGroup.Text>Molfile</InputGroup.Text>
        <Form.Control
          as="textarea"
          rows={5}
          value={this.state.molfile}
          disabled
          readOnly
        />
        <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
          <Button
            variant="light"
            onClick={() => copyToClipboard(sample.molfile || '')}
          >
            <i className="fa fa-clipboard" />
          </Button>
        </OverlayTrigger>
        <Button
          variant="light"
          onClick={this.handleMolfileShow}
        >
          <i className="fa fa-file-text" />
        </Button>
      </InputGroup>
    );
  }

  svgOrLoading(sample) {
    const svgPath = (this.state.loadingMolecule || this.state.loadingComponentDeletion)
      ? '/images/wild_card/loading-bubbles.svg'
      : sample.svgPath;

    const style = 'position-relative d-flex align-items-center justify-content-center';

    const className = `${style} ${svgPath ? 'svg-container' : 'svg-container-empty'}`;

    return sample.can_update ? (
      <>
        <div
          className={className}
          onClick={this.showStructureEditor}
          role="button"
          tabIndex="0"
        >
          <i className="fa fa-pencil position-absolute top-0 end-0" />
          <SVG key={svgPath} src={svgPath} className="molecule-mid" />
        </div>
      </>
    ) : (
      <div className={className}>
        <SVG key={svgPath} src={svgPath} className="molecule-mid" />
      </div>
    );
  }

  sampleAverageMW(sample) {
    let mw;

    if (sample.isMixture() && sample.sample_details) {
      mw = sample.total_mixture_mass_g;
    } else {
      mw = sample.molecule_molecular_weight;
    }

    if (mw) return <ClipboardCopyText text={`${mw.toFixed(MWPrecision)} g/mol`} />;
    return '';
  }

  sampleExactMW(sample) {
    if (sample.isMixture() && sample.sample_details) { return }

    const mw = sample.molecule_exact_molecular_weight;
    if (mw) return <ClipboardCopyText text={`Exact mass: ${mw.toFixed(MWPrecision)} g/mol`} />;
    return '';
  }

  checkMolfileChange() {
    const { trackMolfile } = this.state;
    const { sample } = this.props;
    // !sample.isNew to allow setting mp & bp for new samples
    if (trackMolfile !== sample.molfile && !sample.isNew) {
      sample.updateRange('boiling_point', '', '');
      sample.updateRange('melting_point', '', '');
      this.setState({ sample });
    }
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    });
  }

  hideStructureEditor() {
    this.setState({
      showStructureEditor: false
    });
  }

  /**
   * Sets the loading state for component deletion
   * @param {boolean} loading - Whether component deletion is in progress
   */
  setComponentDeletionLoading(loading) {
    this.setState({
      loadingComponentDeletion: loading
    });
  }

  /**
   * Splits the canonical SMILES string of a mixture sample and updates the sample's molecules in the editor.
   *
   * @param {string} editor - The editor identifier or instance to use for updating molecules.
   * @param {string|null} svgFile - Optional SVG file content to use for rendering.
   * @returns {void}
   */
  splitSmiles(editor) {
    const { sample } = this.state;
    if (!sample.isMixture() || !sample.molecule_cano_smiles || sample.molecule_cano_smiles === '') { return; }

    const mixtureSmiles = sample.molecule_cano_smiles.split('.');
    if (mixtureSmiles) {
      sample.splitSmilesToMolecule(mixtureSmiles, editor)
        .then(() => {
          this.setState({ sample });
        });
    }
  }

  toggleInchi() {
    const { showInchikey } = this.state;
    this.setState({ showInchikey: !showInchikey });
  }

  decoupleMolecule() {
    const { sample } = this.state;
    MoleculesFetcher.decouple(sample.molfile, sample.sample_svg_file, sample.decoupled)
      .then((result) => {
        sample.molecule = result;
        sample.molecule_id = result.id;
        if (result.inchikey === 'DUMMY') { sample.decoupled = true; }
        this.setState({
          sample, pageMessage: result.ob_log
        });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  decoupleChanged(e) {
    const { sample } = this.state;
    sample.decoupled = e.target.checked;
    if (!sample.decoupled) {
      sample.sum_formula = '';
      sample.molecular_mass = null;
    } else {
      if (!sample.sum_formula || sample.sum_formula.trim() === '') sample.sum_formula = 'undefined structure';
      if (sample.residues && sample.residues[0] && sample.residues[0].custom_info) {
        sample.residues[0].custom_info.polymer_type = 'self_defined';
        delete sample.residues[0].custom_info.surface_type;
      }
    }
    if (!sample.decoupled && ((sample.molfile || '') === '')) {
      this.handleSampleChanged(sample);
    } else {
      this.handleSampleChanged(sample, this.decoupleMolecule);
    }
  }

  renderMolfileModal() {
    const { molfile } = this.state;

    return (
      <Modal
        centered
        show={this.state.showMolfileModal}
        dialogClassName="modal-lg"
        onHide={this.handleMolfileClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Molfile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            <Form.Group controlId="molfileInputModal">
              <Form.Control
                as="textarea"
                rows={30}
                readOnly
                disabled
                value={molfile}
              />
            </Form.Group>
          </div>
          <div>
            <Button variant="warning" onClick={this.handleMolfileClose}>
              Close
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    const { sample } = this.state;
    const { visible, isChemicalEdited } = this.state;
    const tabContentsMap = {
      properties: this.samplePropertiesTab('properties'),
      analyses: this.sampleContainerTab('analyses'),
      references: this.sampleLiteratureTab(),
      results: this.sampleImportReadoutTab('results'),
      qc_curation: this.qualityCheckTab('qc_curation'),
      measurements: this.measurementsTab('measurements'),
      history: this.versioningTable('history')
    };

    if (this.enableComputedProps) {
      tabContentsMap.computed_props = this.moleculeComputedProps('computed_props');
    }

    if (this.enableNmrSim) {
      tabContentsMap.nmr_sim = this.nmrSimTab('nmr_sim');
    }

    if (sample.inventory_sample) {
      tabContentsMap.inventory = this.sampleInventoryTab('inventory');
    }

    const tabTitlesMap = {
      literature: 'References',
      qc_curation: 'QC & curation',
      nmr_sim: 'NMR Simulation',
    };

    addSegmentTabs(sample, this.handleSegmentsChange, tabContentsMap);
    const stb = [];
    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
      stb.push(value);
    });

    let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
    segmentKlasses = segmentKlasses.filter((s) => s.element_klass && s.element_klass.name === sample.type);
    segmentKlasses.forEach((klass) => {
      const visIdx = visible.indexOf(klass.label);
      const idx = findIndex(sample.segments, (o) => o.segment_klass_id === klass.id);
      if (visIdx < 0 && idx > -1) {
        const tabContent = tabContentsMap[klass.label];
        if (tabContent) { tabContents.push(tabContent); }
        stb.push(klass.label);
      }
    });

    const { pageMessage, ketcherSVGError } = this.state;
    const messageBlock = (pageMessage
      && (pageMessage.error.length > 0 || pageMessage.warning.length > 0)) ? (
      <Alert variant="warning" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
        <strong>Structure Alert</strong>
        <Button
          size="sm"
          variant="warning"
          onClick={() => this.setState({ pageMessage: null })}
        >
          Close Alert
        </Button>
        {
          pageMessage.error.map((m) => (
            <div key={uuid.v1()}>{m}</div>
          ))
        }
        {
          pageMessage.warning.map((m) => (
            <div key={uuid.v1()}>{m}</div>
          ))
        }
      </Alert>
    ) : null;

    const activeTab = (this.state.activeTab !== 0 && stb.indexOf(this.state.activeTab) > -1
      && this.state.activeTab) || visible.get(0);

    const pendingToSave = sample.isPendingToSave || isChemicalEdited;

    return (
      <DetailCard
        isPendingToSave={pendingToSave}
        header={this.sampleHeader(sample)}
        footer={this.sampleFooter()}
      >
        {ketcherSVGError?.length > 0 && (
          <Alert
            variant="danger"
            show={ketcherSVGError?.length > 0}
            dismissible
            onClose={() => this.setState({ ketcherSVGError: null })}
          >
            <strong>SVG generation failed.</strong>
            {' '}
            Falling back to the previous SVG.
            <br />
            <small className="text-muted">{ketcherSVGError}</small>
          </Alert>
        )}
        {this.sampleInfo(sample)}
        {this.state.sfn && <ScifinderSearch el={sample} />}
        <div className="tabs-container--with-borders">
          <ElementDetailSortTab
            type="sample"
            availableTabs={Object.keys(tabContentsMap)}
            tabTitles={tabTitlesMap}
            onTabPositionChanged={this.onTabPositionChanged}
            addInventoryTab={sample.inventory_sample}
            openedFromCollectionId={this.props.openedFromCollectionId}
          />
          <Tabs
            mountOnEnter
            unmountOnExit
            activeKey={activeTab}
            onSelect={this.handleSelect}
            id="SampleDetailsXTab"
          >
            {tabContents}
          </Tabs>
        </div>
        {this.structureEditorModal(sample)}
        {this.renderMolfileModal()}
        <CommentModal element={sample} />
      </DetailCard>
    );
  }
}

SampleDetails.propTypes = {
  sample: PropTypes.object,
  openedFromCollectionId: PropTypes.number,
};
