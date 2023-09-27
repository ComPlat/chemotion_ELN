/* eslint-disable no-param-reassign */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar,
  InputGroup, FormGroup, FormControl,
  Panel, ListGroup, ListGroupItem, Glyphicon, Tabs, Tab, Row, Col,
  Tooltip, OverlayTrigger,
  ControlLabel, Modal, Alert, Checkbox
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import Clipboard from 'clipboard';
import Select from 'react-select';
import { cloneDeep, findIndex } from 'lodash';
import uuid from 'uuid';
import classNames from 'classnames';
import Immutable from 'immutable';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import QcActions from 'src/stores/alt/actions/QcActions';
import QcStore from 'src/stores/alt/stores/QcStore';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import PubchemLcss from 'src/components/pubchem/PubchemLcss';
import ElementReactionLabels from 'src/apps/mydb/elements/labels/ElementReactionLabels';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';

import StructureEditorModal from 'src/components/structureEditor/StructureEditorModal';

import Sample from 'src/models/Sample';
import PolymerSection from 'src/apps/mydb/elements/details/samples/propertiesTab/PolymerSection';
import ElementalCompositionGroup from 'src/apps/mydb/elements/details/samples/propertiesTab/ElementalCompositionGroup';
import ToggleSection from 'src/components/common/ToggleSection';
import SampleName from 'src/components/common/SampleName';
import ClipboardCopyText from 'src/components/common/ClipboardCopyText';
import SampleForm from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleForm';
import ComputedPropsContainer from 'src/components/computedProps/ComputedPropsContainer';
import ComputedPropLabel from 'src/apps/mydb/elements/labels/ComputedPropLabel';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import SampleDetailsLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
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
import ChemicalTab from 'src/components/ChemicalTab';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';

const MWPrecision = 6;

const decoupleCheck = (sample) => {
  if (!sample.decoupled && sample.molecule && sample.molecule.id === '_none_') {
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
  const lowerbound = sample[`${field}_lowerbound`];
  const upperbound = sample[`${field}_upperbound`];
  if (lowerbound
    && lowerbound !== ''
    && upperbound
    && upperbound !== ''
    && Number.parseFloat(upperbound) < Number.parseFloat(lowerbound)) {
    NotificationActions.add({
      title: `Error on ${field.replace(/(^\w{1})|(_{1}\w{1})/g, (match) => match.toUpperCase())}`, message: 'range lower bound must be less than or equal to range upper', level: 'error', position: 'tc'
    });
    LoadingActions.stop();
    return false;
  }
  return true;
};

const clipboardTooltip = () => (
  <Tooltip id="assign_button">copy to clipboard</Tooltip>
);

const moleculeCreatorTooltip = () => (
  <Tooltip id="assign_button">create molecule</Tooltip>
);
export default class SampleDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sample: props.sample,
      reaction: null,
      materialGroup: null,
      showStructureEditor: false,
      loadingMolecule: false,
      showElementalComposition: false,
      showChemicalIdentifiers: false,
      activeTab: UIStore.getState().sample.activeTab,
      qrCodeSVG: '',
      isCasLoading: false,
      validCas: true,
      showMolfileModal: false,
      trackMolfile: props.sample.molfile,
      smileReadonly: !(
        typeof props.sample.molecule.inchikey === 'undefined'
        || props.sample.molecule.inchikey == null
        || props.sample.molecule.inchikey === 'DUMMY'
      ),
      quickCreator: false,
      showInchikey: false,
      pageMessage: null,
      visible: Immutable.List(),
      startExport: false,
      sfn: UIStore.getState().hasSfn,
      saveInventoryAction: false,
    };

    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    this.enableComputedProps = MatrixCheck(currentUser.matrix, 'computedProp');
    this.enableSampleDecoupled = MatrixCheck(
      currentUser.matrix,
      'sampleDecoupled'
    );
    this.enableNmrSim = MatrixCheck(currentUser.matrix, 'nmrSim');

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.clipboard = new Clipboard('.clipboardBtn');
    this.isCASNumberValid = this.isCASNumberValid.bind(this);
    this.handleMolfileShow = this.handleMolfileShow.bind(this);
    this.handleMolfileClose = this.handleMolfileClose.bind(this);
    this.handleSampleChanged = this.handleSampleChanged.bind(this);
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
  }

  componentDidMount() {
    const { sample } = this.props;
    UIStore.listen(this.onUIStoreChange);
    const { activeTab } = this.state;
    this.fetchQcWhenNeeded(activeTab);
    CommentActions.fetchComments(sample);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (
      (nextProps.sample.isNew
        && (typeof nextProps.sample.molfile === 'undefined'
          || (nextProps.sample.molfile || '').length === 0))
      || (typeof nextProps.sample.molfile !== 'undefined'
        && nextProps.sample.molecule.inchikey === 'DUMMY')
    ) {
      this.setState({
        smileReadonly: false,
      });
    } else {
      this.setState({
        smileReadonly: true,
      });
    }
    this.setState({
      sample: nextProps.sample,
      loadingMolecule: false,
      isCasLoading: false,
    });
  }

  componentWillUnmount() {
    this.clipboard.destroy();
    UIStore.unlisten(this.onUIStoreChange);
  }

  handleMolfileShow() {
    this.setState({
      showMolfileModal: true,
    });
  }

  handleMolfileClose() {
    this.setState({
      showMolfileModal: false,
    });
  }

  handleSampleChanged(sample, cb) {
    this.setState(
      {
        sample,
      },
      cb
    );
  }

  handleAmountChanged(amount) {
    const { sample } = this.state;
    sample.setAmountAndNormalizeToGram(amount);
    this.setState({ sample });
  }

  handleImportedReadoutChanged(e) {
    const { sample } = this.state;
    sample.imported_readout = e.target.value;
    this.setState({
      sample
    });
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

  toggleInchi() {
    const { showInchikey } = this.state;
    this.setState({ showInchikey: !showInchikey });
  }

  updateGrandparent(name, kind, value) {
    let { sample } = this.state;
    sample[name] = value;
    if((name == 'boiling_point' || name == 'melting_point') && value) {
      // remove parenthesis
      value = value.replace(/[\])}[{(]/g, '');
      let temperatureArr = value.split(',');
      sample.updateRange(name, temperatureArr[0], temperatureArr[1]);
    }

    this.setState({ sample });
  }

  handleRevert = (change, changes, callback) => {
    const { sample } = this.state;
    const { name, oldValue } = change;
    const nextSample = new Sample({
      ...sample,
      [name]: oldValue,
    });
    if ((name === 'boiling_point' || name === 'melting_point') && oldValue) {
      // See VersionsTableChanges#numrange for reference
      const values = oldValue.slice(1, -1).split(',');
      nextSample.updateRange(name, values[0], values[1]);
    }
    if (oldValue && name === 'molfile') {
      const otherChange = changes.find((c) => c.name === 'sample_svg_file');
      if (!otherChange) return;

      nextSample[otherChange.name] = otherChange.oldValue;
      this.handleStructureEditorSave(oldValue);
    }
    if (oldValue && name === 'sample_svg_file') {
      const otherChange = changes.find((c) => c.name === 'molfile');
      if (!otherChange) return;

      nextSample[otherChange.name] = otherChange.oldValue;
      this.handleStructureEditorSave(otherChange.oldValue);
    }
    this.setState({ sample: nextSample }, () => {
      this.handleSubmit().then(() => callback());
    });
  };

  handleFastInput(smi) {
    this.setState({ showChemicalIdentifiers: true }, () => {
      this.smilesInput.value = smi;
      this.handleMoleculeBySmile(cas);
    });
  }

  handleMoleculeBySmile(cas) {
    const smi = this.smilesInput.value;
    const { sample } = this.state;
    const casObj = {};
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        if (!result || result == null) {
          NotificationActions.add({
            title: 'Error on Sample creation',
            message: `Cannot create molecule with this smiles! [${smi}]`,
            level: 'error',
            position: 'tc',
          });
        } else {
          sample.molfile = result.molfile;
          sample.molecule_id = result.id;
          sample.molecule = result;
          this.molfileInput.value = result.molfile;
          this.inchistringInput.value = result.inchistring;
          sample.xref = { ...sample.xref, cas: cas };
          this.setState({
            quickCreator: true,
            sample,
            smileReadonly: true,
            pageMessage: result.ob_log,
          });
          ElementActions.refreshElements('sample');
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      })
      .finally(() => LoadingActions.stop());
  }

  handleElementalSectionToggle() {
    const { showElementalComposition } = this.state;
    this.setState({
      showElementalComposition: !showElementalComposition
    });
  }

  handleChemIdentSectionToggle() {
    const { showChemicalIdentifiers } = this.state;
    this.setState({
      showChemicalIdentifiers: !showChemicalIdentifiers
    });
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

  onUIStoreChange(state) {
    const { activeTab } = this.state;
    if (state.sample.activeTab !== activeTab) {
      this.setState((previousState) => ({
        ...previousState, activeTab: state.sample.activeTab
      }));
    }
  }

  decoupleChanged(e) {
    const { sample } = this.state;
    sample.decoupled = e.target.checked;
    if (!sample.decoupled) {
      sample.sum_formula = '';
    } else {
      if (sample.sum_formula.trim() === '') sample.sum_formula = 'undefined structure';
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

  showStructureEditor = () => {
    this.setState({
      showStructureEditor: true
    });
  };

  handleInventorySample(e) {
    const { sample } = this.state;
    sample.inventory_sample = e.target.checked;
    this.handleSampleChanged(sample);
    if (!e.target.checked) {
      this.setState({ activeTab: 'properties' });
    }
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
  }

  // eslint-disable-next-line camelcase
  handleStructureEditorSave(molfile, svgFile = null, config = null, editor = 'ketcher') {
    const { sample } = this.state;
    sample.molfile = molfile;
    const smiles = config && sample.molecule ? config.smiles : null;
    sample.contains_residues = molfile.indexOf(' R# ') > -1;
    sample.formulaChanged = true;
    this.setState({ loadingMolecule: true });

    const fetchError = (errorMessage) => {
      NotificationActions.add({
        title: 'Error on Sample creation', message: `Cannot create molecule! Error: [${errorMessage}]`, level: 'error', position: 'tc'
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

  handleStructureEditorCancel = () => {
    this.hideStructureEditor();
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

  handleSubmit(closeView = false) {
    LoadingActions.start();
    let promise = Promise.resolve();

    const { sample, validCas } = this.state;
    this.checkMolfileChange();
    if (!validCas) {
      sample.xref = { ...sample.xref, cas: '' };
    }
    if (!decoupleCheck(sample)) return;
    if (!rangeCheck('boiling_point', sample)) return;
    if (!rangeCheck('melting_point', sample)) return;
    if (sample.belongTo && sample.belongTo.type === 'reaction') {
      const reaction = sample.belongTo;
      reaction.editedSample = sample;
      const materialGroup = sample.matGroup;
      if (sample.isNew) {
        promise = ElementActions.createSampleForReaction(sample, reaction, materialGroup);
      } else {
        promise = ElementActions.updateSampleForReaction(sample, reaction, closeView);
      }
    } else if (sample.belongTo && sample.belongTo.type === 'wellplate') {
      const wellplate = sample.belongTo;
      promise = ElementActions.updateSampleForWellplate(sample, wellplate);
    } else if (sample.isNew) {
      promise = ElementActions.createSample(sample, closeView);
    } else {
      sample.cleanBoilingMelting();
      promise = ElementActions.updateSample(new Sample(sample), closeView);
    }

    if (sample.is_new || closeView) {
      DetailActions.close(sample, true);
    }
    sample.updateChecksum();
    this.setState({ validCas: true, trackMolfile: sample.molfile });

    return promise;
  }

  toggleInchi() {
    const { showInchikey } = this.state;
    this.setState({ showInchikey: !showInchikey });
  }

  svgOrLoading() {
    const { sample, loadingMolecule } = this.state;
    let svgPath = '';
    if (loadingMolecule) {
      svgPath = '/images/wild_card/loading-bubbles.svg';
    } else {
      ({ svgPath } = sample);
    }
    const className = svgPath ? 'svg-container' : 'svg-container-empty';
    return sample.can_update ? (
      <div
        aria-hidden="true"
        className={className}
        onClick={this.showStructureEditor}
      >
        <Glyphicon className="pull-right" glyph="pencil" />
        <SVG key={svgPath} src={svgPath} className="molecule-mid" />
      </div>
    ) : (
      <div className={className}>
        <SVG key={svgPath} src={svgPath} className="molecule-mid" />
      </div>
    );
  }

  sampleAverageMW() {
    const { sample } = this.state;
    const mw = sample.molecule_molecular_weight;
    if (mw) {
      return <ClipboardCopyText text={`${mw.toFixed(MWPrecision)} g/mol`} />;
    }
    return '';
  }

  sampleExactMW() {
    const { sample } = this.state;
    const mw = sample.molecule_exact_molecular_weight;
    if (mw) {
      return (
        <ClipboardCopyText
          text={`Exact mass: ${mw.toFixed(MWPrecision)} g/mol`}
        />
      );
    }
    return '';
  }

  sampleHeader() {
    const { sample } = this.state;
    const saveBtnDisplay = sample.isEdited ? '' : 'none';
    const titleTooltip = formatTimeStampsOfElement(sample || {});

    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection
      && currentCollection.is_shared === false
      && currentCollection.is_locked === false
      && currentCollection.label !== 'All'
      ? currentCollection.id
      : null;

    const copyBtn = sample.can_copy && !sample.isNew ? (
      <CopyElementModal element={sample} defCol={defCol} />
    ) : null;

    const colLabel = sample.isNew ? null : (
      <ElementCollectionLabels
        element={sample}
        key={sample.id}
        placement="right"
      />
    );
    const inventorySample = (
      <Checkbox className="sample-inventory-header" checked={sample.inventory_sample} onChange={(e) => this.handleInventorySample(e)}>
        Inventory
      </Checkbox>
    );

    const decoupleCb = sample.can_update && this.enableSampleDecoupled ? (
      <Checkbox
        className="sample-header-decouple"
        checked={sample.decoupled}
        onChange={(e) => this.decoupleChanged(e)}
      >
        Decoupled
      </Checkbox>
    ) : null;

    const { toggleFullScreen } = this.props;

    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="sampleDates">{titleTooltip}</Tooltip>}
        >
          <span>
            <i className="icon-sample" />{sample.title()}
          </span>
        </OverlayTrigger>
        <ShowUserLabels element={sample} />
        <ElementAnalysesLabels element={sample} key={`${sample.id}_analyses`} />
        {colLabel}
        <ElementReactionLabels element={sample} key={`${sample.id}_reactions`} />
        <PubchemLabels element={sample} />
        <HeaderCommentSection element={sample} />
        {sample.isNew
          ? <FastInput fnHandle={this.handleFastInput} />
          : null}
        <div style={{ marginLeft: 'auto' }}>
          <ConfirmClose el={sample} />
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="saveCloseSample">Save and Close Sample</Tooltip>}
          >
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              className="button-right"
              onClick={() => this.handleSubmit(true)}
              style={{ display: saveBtnDisplay }}
              disabled={!this.sampleIsValid() || !sample.can_update}
            >
              <i className="fa fa-floppy-o" />
              <i className="fa fa-times" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="saveSample">Save Sample</Tooltip>}
          >
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              className="button-right"
              onClick={() => this.handleSubmit()}
              style={{ display: saveBtnDisplay }}
              disabled={!this.sampleIsValid() || !sample.can_update}
            >
              <i className="fa fa-floppy-o" />
            </Button>
          </OverlayTrigger>
          {copyBtn}
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
          <PrintCodeButton element={sample} />
          {sample.isNew
            ? null
            : <OpenCalendarButton isPanelHeader eventableId={sample.id} eventableType="Sample" />}
          {inventorySample}
          {decoupleCb}
        </div>
        <ShowUserLabels element={sample} />
      </div>
    );
  }

  transferToDeviceButton(sample) {
    return (
      <Button
        bsSize="xsmall"
        onClick={() => {
          const { selectedDeviceId, devices } = ElementStore.getState().elements.devices;
          const device = devices.find((d) => d.id === selectedDeviceId);
          ElementActions.addSampleToDevice(sample, device, { save: true });
        }}
        style={{ marginLeft: 25 }}
      >
        Transfer to Device
      </Button>
    );
  }

  sampleInfo() {
    const { sample } = this.state;
    const style = { height: 'auto', marginBottom: '20px' };
    let pubchemLcss = (
      sample.pubchem_tag
      && sample.pubchem_tag.pubchem_lcss
      && sample.pubchem_tag.pubchem_lcss.Record
    ) || null;    if (pubchemLcss && pubchemLcss.Reference) {
      const echa = pubchemLcss.Reference.filter((e) => e.SourceName === 'European Chemicals Agency (ECHA)').map((e) => e.ReferenceNumber);
      if (echa.length > 0) {
        pubchemLcss = pubchemLcss.Section.find(
          (e) => e.TOCHeading === 'Safety and Hazards'
        ) || [];
        pubchemLcss = pubchemLcss.Section.find(
          (e) => e.TOCHeading === 'Hazards Identification'
        ) || [];
        pubchemLcss = pubchemLcss.Section[0].Information.filter(
          (e) => echa.includes(e.ReferenceNumber)
        ) || null;
      } else pubchemLcss = null;
    }
    const pubchemCid = sample.pubchem_tag && sample.pubchem_tag.pubchem_cid
      ? sample.pubchem_tag.pubchem_cid : 0;
    const lcssSign = pubchemLcss && !sample.decoupled
      ? <PubchemLcss cid={pubchemCid} informArray={pubchemLcss} /> : <div />;

    return (
      <Row style={style}>
        <Col md={4}>
          <h4>
            <SampleName sample={sample} />
          </h4>
          <h5>{this.sampleAverageMW()}</h5>
          <h5>{this.sampleExactMW()}</h5>
          {sample.isNew ? null : <h6>{this.moleculeCas()}</h6>}
          {lcssSign}
        </Col>
        <Col md={8}>{this.svgOrLoading()}</Col>
      </Row>
    );
  }

  moleculeInchi(sample) {
    const { showInchikey } = this.state;
    if (typeof (this.inchistringInput) !== 'undefined' && this.inchistringInput
      && typeof (sample.molecule_inchistring) !== 'undefined' && sample.molecule_inchistring) {
      this.inchistringInput.value = sample.molecule_inchistring;
    }
    const inchiLabel = showInchikey ? 'InChIKey' : 'InChI';
    const inchiTooltip = <Tooltip id="inchi_tooltip">toggle InChI/InChIKey</Tooltip>;

    return (
      <InputGroup className="sample-molecule-identifier">
        <InputGroup.Button>
          <OverlayTrigger placement="top" overlay={inchiTooltip}>
            <Button active onClick={this.toggleInchi}>
              {inchiLabel}
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <FormGroup controlId="inchistringInput">
          <FormControl
            type="text"
            inputRef={(m) => {
              this.inchistringInput = m;
            }}
            key={sample.id}
            value={(showInchikey ? sample.molecule_inchikey : sample.molecule_inchistring) || ''}
            disabled
            readOnly
          />
        </FormGroup>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={clipboardTooltip()}>
            <Button
              active
              className="clipboardBtn"
              data-clipboard-text={
                (showInchikey
                  ? sample.molecule_inchikey
                  : sample.molecule_inchistring) || ' '
              }
            >
              <i className="fa fa-clipboard" />
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
      </InputGroup>
    );
  }

  moleculeCanoSmiles(sample) {
    const { smileReadonly } = this.state;
    if (smileReadonly && typeof (this.smilesInput) !== 'undefined'
      && this.smilesInput && typeof (sample.molecule_cano_smiles) !== 'undefined'
      && sample.molecule_cano_smiles) {
      this.smilesInput.value = sample.molecule_cano_smiles;
    }
    return (
      <InputGroup className="sample-molecule-identifier">
        <InputGroup.Addon>Canonical Smiles</InputGroup.Addon>
        <FormGroup controlId="smilesInput">
          <FormControl
            type="text"
            id="smilesInput"
            inputRef={(m) => {
              this.smilesInput = m;
            }}
            defaultValue={sample.molecule_cano_smiles || ''}
            disabled={smileReadonly}
            readOnly={smileReadonly}
          />
        </FormGroup>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={clipboardTooltip()}>
            <Button
              active
              className="clipboardBtn"
              data-clipboard-text={sample.molecule_cano_smiles || ' '}
            >
              <i className="fa fa-clipboard" />
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={moleculeCreatorTooltip()}>
            <Button
              active
              className="clipboardBtn"
              id="smile-create-molecule"
              disabled={smileReadonly}
              readOnly={smileReadonly}
              onClick={() => this.handleMoleculeBySmile()}
            >
              <i className="fa fa-save" />
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
      </InputGroup>
    );
  }

  moleculeMolfile(sample) {
    if (
      typeof this.molfileInput !== 'undefined'
      && this.molfileInput
      && typeof sample.molfile !== 'undefined'
      && sample.molfile
    ) {
      this.molfileInput.value = sample.molfile;
    }

    const textAreaStyle = {
      minHeight: '35px',
      height: '35px',
      overflow: 'auto',
      whiteSpace: 'pre',
      resize: 'vertical',
    };

    return (
      <InputGroup className="sample-molecule-identifier">
        <InputGroup.Addon>Molfile</InputGroup.Addon>
        <FormGroup controlId="molfileInput">
          <FormControl
            componentClass="textarea"
            style={textAreaStyle}
            inputRef={(m) => {
              this.molfileInput = m;
            }}
            defaultValue={sample.molfile || ''}
            disabled
            readOnly
          />
        </FormGroup>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={clipboardTooltip()}>
            <Button
              active
              className="clipboardBtn"
              data-clipboard-text={sample.molfile || ' '}
            >
              <i className="fa fa-clipboard" />
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <InputGroup.Button>
          <Button
            active
            className="clipboardBtn"
            onClick={this.handleMolfileShow}
          >
            <i className="fa fa-file-text" />
          </Button>
        </InputGroup.Button>
      </InputGroup>
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

  onCasSelectOpen(e, casArr) {
    const { sample } = this.state;
    if (casArr.length === 0) {
      this.setState({ isCasLoading: true });
      DetailActions.getMoleculeCas(sample);
    }
  }

  moleculeCas() {
    const { sample, isCasLoading, validCas } = this.state;
    const { molecule, xref } = sample;
    const cas = xref?.cas ?? '';
    let casArr = [];
    casArr = molecule?.cas?.filter((element) => element !== null);
    casArr = cas && casArr && cas !== '' && !casArr.includes(cas) ? [...casArr, cas] : casArr;
    const onChange = (e) => this.updateCas(e);
    const onOpen = (e) => this.onCasSelectOpen(e, casArr);
    const validate = () => this.isCASNumberValid(cas || '', true);
    const errorMessage = <span className="text-danger">Cas number is invalid</span>;
    const options = casArr?.map((element) => ({ label: element, value: element }));
    return (
      <div className="form-row" style={{ maxWidth: '300px' }}>
        <InputGroup className="sample-molecule-identifier">
          <InputGroup.Addon>CAS</InputGroup.Addon>
          <Select.Creatable
            name="cas"
            multi={false}
            options={options}
            onChange={onChange}
            onOpen={onOpen}
            isLoading={isCasLoading}
            value={cas}
            onBlur={validate}
            disabled={!sample.can_update}
          />
          <InputGroup.Button>
            <OverlayTrigger placement="bottom" overlay={clipboardTooltip()}>
              <Button active className="clipboardBtn" data-clipboard-text={cas}><i className="fa fa-clipboard" /></Button>
            </OverlayTrigger>
          </InputGroup.Button>
        </InputGroup>
        <div style={{ marginTop: '-11px' }}>
          {!validCas && errorMessage}
        </div>
      </div>
    );
  }

  handleSegmentsChange(se) {
    const { sample } = this.state;
    const { segments } = sample;
    const idx = findIndex(segments, (o) => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    sample.segments = segments;
    sample.changed = true;
    this.setState({ sample });
  }

  customizableField() {
    /* eslint-disable camelcase */
    const { sample } = this.state;
    const { xref } = sample;
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
            <FormGroup>
              <ControlLabel>{key}</ControlLabel>
              <FormControl type="text" defaultValue={customKeys[key] || ''} onChange={(e) => this.updateKey(key, e)} />
            </FormGroup>
          </td>
        </tr>
      ))
    );
    /* eslint-enable camelcase */
  }

  updateKey(key, e) {
    const { sample } = this.state;
    sample.xref[key] = e.target.value;
    this.setState({ sample });
  }

  elementalPropertiesItemHeader() {
    const { sample, showElementalComposition } = this.state;
    let label;
    if (sample.contains_residues) {
      label = 'Polymer section';
      if (!showElementalComposition) {
        label += ' / Elemental composition';
      }
    } else {
      label = 'Elemental composition';
    }

    return (
      <ListGroupItem onClick={() => this.handleElementalSectionToggle()}>
        <Col className="padding-right elem-composition-header" md={6}>
          <b>{label}</b>
        </Col>
        <div className="col-md-6">
          <ToggleSection show={showElementalComposition} />
        </div>
      </ListGroupItem>
    );
  }

  elementalPropertiesItemContent() {
    const { sample, showElementalComposition, materialGroup } = this.state;

    if (!showElementalComposition) return false;

    if (sample.contains_residues) {
      return (
        <ListGroupItem className="ea-section">
          <PolymerSection
            sample={sample}
            parent={this}
            show={sample.contains_residues}
            materialGroup={materialGroup}
          />
        </ListGroupItem>
      );
    }
    return (
      <ListGroupItem className="ea-section">
        <Row>
          <Col md={6}>
            <ElementalCompositionGroup
              handleSampleChanged={(s) => this.handleSampleChanged(s)}
              sample={sample}
            />
          </Col>
        </Row>
      </ListGroupItem>
    );
  }

  elementalPropertiesItem() {
    const { sample } = this.state;

    // avoid empty ListGroupItem
    if (!sample.molecule_formula) {
      return false;
    }

    return (
      <div width="100%" className="polymer-section">
        {this.elementalPropertiesItemHeader()}
        {this.elementalPropertiesItemContent()}
      </div>
    );
  }

  chemicalIdentifiersItemHeader() {
    const { sample, showChemicalIdentifiers } = this.state;
    return (
      <ListGroupItem onClick={() => this.handleChemIdentSectionToggle()}>
        <Col className="padding-right chem-identifiers-header" md={6}>
          <b>Chemical identifiers</b>
          {sample.decoupled && (
            <span className="text-danger">&nbsp;[decoupled]</span>
          )}
        </Col>
        <div className="col-md-6">
          <ToggleSection show={showChemicalIdentifiers} />
        </div>
      </ListGroupItem>
    );
  }

  chemicalIdentifiersItemContent() {
    const { sample, showChemicalIdentifiers } = this.state;
    if (!showChemicalIdentifiers) return false;
    return (
      <ListGroupItem>
        {this.moleculeInchi(sample)}
        {this.moleculeCanoSmiles(sample)}
        {this.moleculeMolfile(sample)}
      </ListGroupItem>
    );
  }

  chemicalIdentifiersItem() {
    const { sample } = this.state;
    return (
      <div
        width="100%"
        className={classNames({
          'chem-identifiers-section': true,
          decoupled: sample.decoupled,
        })}
      >
        {this.chemicalIdentifiersItemHeader()}
        {this.chemicalIdentifiersItemContent()}
      </div>
    );
  }

  samplePropertiesTab(ind) {
    const { sample } = this.state;
    return (
      <Tab eventKey={ind} title="Properties" key={'Props' + sample.id.toString()}>
        {
          !sample.isNew && <CommentSection section="sample_properties" element={sample} />
        }
        <ListGroupItem>
          <SampleForm
            sample={sample}
            parent={this}
            customizableField={this.customizableField}
            enableSampleDecoupled={this.enableSampleDecoupled}
            decoupleMolecule={this.decoupleMolecule}
          />
        </ListGroupItem>
        <EditUserLabels element={sample} />
        {this.elementalPropertiesItem()}
        {this.chemicalIdentifiersItem()}
      </Tab>
    );
  }

  handleSubmitInventory() {
    this.setState({ saveInventoryAction: true });
  }

  saveSampleOrInventory(closeView) {
    const { activeTab, sample } = this.state;
    if (activeTab === 'inventory' && sample.inventory_sample) {
      this.handleSubmitInventory();
    } else {
      this.handleSubmit(closeView);
    }
  }

  sampleInventoryTab(ind) {
    const sample = this.state.sample || {};
    const { saveInventoryAction } = this.state;

    return (
      <Tab eventKey={ind} title="Inventory" key={`Inventory${sample.id.toString()}`}>
        {
          !sample.isNew && <CommentSection section="sample_inventory" element={sample} />
        }
        <ListGroupItem>
          <ChemicalTab
            sample={sample}
            parent={this}
            saveInventory={saveInventoryAction}
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
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <SampleDetailsContainers
            sample={sample}
            setState={(updatedSample) => {
              this.setState(updatedSample);
            }}
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
    if (!sample) {
      return null;
    }
    return (
      <Tab
        eventKey="references"
        title="References"
        key={`References_${sample.id}`}
      >
        {
          !sample.isNew && <CommentSection section="sample_references" element={sample} />
        }
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <SampleDetailsLiteratures element={sample} />
        </ListGroupItem>
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
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <FormGroup controlId="importedReadoutInput">
            <ControlLabel>Imported Readout</ControlLabel>
            <InputGroup>
              <FormControl
                type="text"
                value={sample.imported_readout || ''}
                disabled
                readOnly
              />
            </InputGroup>
          </FormGroup>
        </ListGroupItem>
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
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <MeasurementsTab sample={sample} />
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
        &nbsp; Computed Properties
      </span>
    );

    return (
      <Tab eventKey={ind} title={title} key={key}>
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <ComputedPropsContainer sample={sample} />
        </ListGroupItem>
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
    if (!sample) {
      return null;
    }
    return (
      <Tab
        eventKey={ind}
        title="QC & curation"
        key={`QC_${sample.id}_${ind}`}
      >
        {
          !sample.isNew && <CommentSection section="sample_qc_curation" element={sample} />
        }
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <QcMain
            sample={sample}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  historyTab(ind) {
    const { sample } = this.state;
    if (!sample) {
      return null;
    }
    return (
      <Tab eventKey={ind} title="History" key={`${sample.id}_${ind}`}>
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <VersionsTable
            type="samples"
            id={sample.id}
            handleRevert={this.handleRevert}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  nmrSimTab(ind) {
    const { sample } = this.state;
    if (!sample) {
      return null;
    }
    return (
      <Tab
        eventKey={ind}
        title="NMR Simulation"
        key={`NMR_${sample.id}_${ind}`}
      >
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <NmrSimTab sample={sample} />
        </ListGroupItem>
      </Tab>
    );
  }

  sampleIsValid() {
    const { sample, loadingMolecule, quickCreator } = this.state;
    return (
      (sample.isValid && !loadingMolecule)
      || sample.is_scoped === true
      || quickCreator
    );
  }

  saveBtn(sample, closeView = false) {
    let submitLabel = sample && sample.isNew ? 'Create' : 'Save';
    const isDisabled = !sample.can_update;
    if (closeView) submitLabel += ' and close';

    return (
      <Button
        id="submit-sample-btn"
        bsStyle="warning"
        onClick={() => this.saveSampleOrInventory(closeView)}
        disabled={!this.sampleIsValid() || isDisabled}
      >
        {submitLabel}
      </Button>
    );
  }

  sampleFooter() {
    const { sample, startExport } = this.state;
    const belongToReaction = sample.belongTo && sample.belongTo.type === 'reaction';
    const hasAnalyses = !!(sample.analyses && sample.analyses.length > 0);
    const downloadAnalysesBtn = sample.isNew || !hasAnalyses ? null : (
      <Button
        bsStyle="info"
        disabled={!this.sampleIsValid()}
        onClick={() => this.handleExportAnalyses(sample)}
      >
        Download Analysis
        {' '}
        {startExport ? (
          <span>
              &nbsp;
            <i className="fa fa-spin fa-spinner" />
          </span>
        ) : null}
      </Button>
    );

    const saveAndCloseBtn = belongToReaction && !sample.isNew ? this.saveBtn(sample, true) : null;
    return (
      <ButtonToolbar>
        <Button bsStyle="primary" onClick={() => DetailActions.close(sample)}>
          Close
        </Button>
        {this.saveBtn(sample)}
        {saveAndCloseBtn}
        {downloadAnalysesBtn}
      </ButtonToolbar>
    );
  }

  structureEditorModal() {
    const { sample, showStructureEditor } = this.state;
    const { molfile } = sample;
    const hasParent = sample && sample.parent_id;
    const hasChildren = sample && sample.children_count > 0;
    return (
      <StructureEditorModal
        key={sample.id}
        showModal={showStructureEditor}
        onSave={this.handleStructureEditorSave.bind(this)}
        onCancel={this.handleStructureEditorCancel.bind(this)}
        molfile={molfile}
        hasParent={hasParent}
        hasChildren={hasChildren}
      />
    );
  }

  renderMolfileModal() {
    const { showMolfileModal } = this.state;
    const textAreaStyle = {
      width: '500px',
      height: '640px',
      margin: '30px',
      whiteSpace: 'pre-line',
    };
    if (showMolfileModal) {
      return (
        <Modal
          show={showMolfileModal}
          dialogClassName="importChemDrawModal"
          onHide={this.handleMolfileClose}
        >
          <Modal.Header closeButton>
            <Modal.Title>Molfile</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div>
              <FormGroup controlId="molfileInputModal">
                <FormControl
                  componentClass="textarea"
                  style={textAreaStyle}
                  readOnly
                  disabled
                  defaultValue={this.molfileInput.value || ''}
                />
              </FormGroup>
            </div>
            <div>
              <Button bsStyle="warning" onClick={this.handleMolfileClose}>
                Close
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    return <div />;
  }

  render() {
    const {
      sample, visible, activeTab, sfn
    } = this.state;
    const tabContentsMap = {
      properties: this.samplePropertiesTab('properties'),
      analyses: this.sampleContainerTab('analyses'),
      references: this.sampleLiteratureTab(),
      results: this.sampleImportReadoutTab('results'),
      qc_curation: this.qualityCheckTab('qc_curation'),
      measurements: this.measurementsTab('measurements'),
      history: this.historyTab('history'),
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
      computed_props: 'computed props',
      nmr_sim: 'NMR Simulation',
      measurements: 'Measurements',
      inventory: 'Inventory'
    };

    addSegmentTabs(sample, this.handleSegmentsChange, tabContentsMap);
    const stb = [];
    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) {
        tabContents.push(tabContent);
      }
      stb.push(value);
    });

    let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
    segmentKlasses = segmentKlasses.filter(
      (s) => s.element_klass && s.element_klass.name === sample.type
    );
    segmentKlasses.forEach((klass) => {
      const visIdx = visible.indexOf(klass.label);
      const idx = findIndex(sample.segments, (o) => o.segment_klass_id === klass.id);
      if (visIdx < 0 && idx > -1) {
        const tabContent = tabContentsMap[klass.label];
        if (tabContent) {
          tabContents.push(tabContent);
        }
        stb.push(klass.label);
      }
    });

    const { pageMessage } = this.state;
    const messageBlock = (pageMessage
      && (pageMessage.error.length > 0 || pageMessage.warning.length > 0)) ? (
        <Alert bsStyle="warning" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
          <strong>Structure Alert</strong>
          &nbsp;
          <Button bsSize="xsmall" bsStyle="warning" onClick={() => this.setState({ pageMessage: null })}>Close Alert</Button>
          <br />
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

    const currentActiveTab = (activeTab !== 0 && stb.indexOf(activeTab) > -1
      && activeTab) || visible.get(0);

    return (
      <Panel
        className="eln-panel-detail"
        bsStyle={sample.isPendingToSave ? 'info' : 'primary'}
      >
        <Panel.Heading>
          {this.sampleHeader()}
          {messageBlock}
        </Panel.Heading>
        <Panel.Body>
          {this.sampleInfo()}
          <ListGroup>
            <ElementDetailSortTab
              type="sample"
              availableTabs={Object.keys(tabContentsMap)}
              tabTitles={tabTitlesMap}
              onTabPositionChanged={this.onTabPositionChanged}
              addInventoryTab={sample.inventory_sample}
            />
            {sfn ? <ScifinderSearch el={sample} /> : null}
            <Tabs
              activeKey={currentActiveTab}
              onSelect={this.handleSelect}
              id="SampleDetailsXTab"
              mountOnEnter
              unmountOnExit
            >
              {tabContents}
            </Tabs>
          </ListGroup>
          {this.sampleFooter()}
          {this.structureEditorModal()}
          {this.renderMolfileModal()}
          <CommentModal element={sample} />
        </Panel.Body>
      </Panel>
    );
  }
}

SampleDetails.propTypes = {
  sample: PropTypes.object.isRequired,
  toggleFullScreen: PropTypes.func.isRequired,
};
