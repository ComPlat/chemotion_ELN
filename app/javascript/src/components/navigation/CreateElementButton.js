import React from 'react';
import {
  Button, ButtonToolbar, Form, Modal, Dropdown, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import Aviator from 'aviator';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import { allElnElements, allElnElmentsWithLabel, allGenericElements } from 'src/apps/generic/Utils';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import MatrixCheck from 'src/components/common/MatrixCheck';
import UIActions from 'src/stores/alt/actions/UIActions';

const CreateElementDropdownToggle = React.forwardRef(({ children, onClick }, ref) => (
  <Button
    variant="success"
    className="rounded-circle shadow" 
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}>
      <i className="fa fa-plus" />
    </Button>
));

export default class CreateElementButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isDisabled: true,
      samples: [],
      collectionId: null,
      layout: UserStore.getState().profile?.data?.layout || {},
      modalProps: {
        show: false,
        sampleCount: 0,
        wellplateCount: 0
      },
      showCopyReactionModal: false,
      pendingReactionId: null
    }

    this.createBtn = this.createBtn.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.handleCopyReactionConfirm = this.handleCopyReactionConfirm.bind(this);
    this.handleCopyReactionModalClose = this.handleCopyReactionModalClose.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onUserStoreChange);
    UIStore.listen(this.onUIStoreChange);
    this.onUIStoreChange(UIStore.getState());
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserStoreChange);
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUserStoreChange(state) {
    const layout = state.profile?.data?.layout;
    // eslint-disable-next-line react/destructuring-assignment
    if (typeof layout !== 'undefined' && layout !== null && layout !== this.state.layout) {
      this.setState({ layout });
    }
  }

  onUIStoreChange({ currentCollection }) {
    if (!currentCollection) {
      this.setState({ isDisabled: true });
      return;
    }

    const {
      label,
      is_locked,
      is_shared,
      is_synchronized,
      is_sync_to_me,
      permission_level
    } = currentCollection;

    const newIsDisabled = (
      (label === 'All' && is_locked)
      || (is_shared && is_synchronized === false)
      || (is_sync_to_me && permission_level < PermissionConst.Write)
    );
    this.setState({ isDisabled: newIsDisabled });
  }

  getSampleFilter() {
    let uiState = UIStore.getState();
    return this.filterParamsFromUIStateByElementType(uiState, "sample");
  }

  getReactionId() {
    let uiState = UIStore.getState();
    return uiState.reaction.checkedIds.first();
  }

  getCellLineId() {
    let uiState = UIStore.getState();
    return uiState.cell_line.checkedIds.first();
  }

  isCopySampleDisabled() {
    let sampleFilter = this.getSampleFilter();
    return !sampleFilter.all && sampleFilter.included_ids.size == 0;
  }

  copySample() {
    let sampleFilter = this.getSampleFilter();

    // Set limit to 1 because we are only interested in one sample
    let params = {
      sample: sampleFilter,
      limit: 1
    }

    ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'copy_sample');
  }

  isCopyReactionDisabled() {
    let reactionId = this.getReactionId();
    return !reactionId;
  }

  copyReaction() {
    const reactionId = this.getReactionId();
    this.setState({ showCopyReactionModal: true, pendingReactionId: reactionId });
  }

  handleCopyReactionConfirm(keepAmounts) {
    const { pendingReactionId } = this.state;
    this.setState({ showCopyReactionModal: false, pendingReactionId: null });
    ElementActions.copyReactionFromId(pendingReactionId, keepAmounts);
  }

  handleCopyReactionModalClose() {
    this.setState({ showCopyReactionModal: false, pendingReactionId: null });
  }

  copyReactionAmountsModal() {
    const { showCopyReactionModal } = this.state;
    return (
      <Modal centered animation={false} show={showCopyReactionModal} onHide={this.handleCopyReactionModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Copy Reaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Do you also want to copy the
          <strong> real amounts </strong>
          of the reaction materials (excluding product materials)?
          <br />
          <br />
          <strong>Note: </strong>
          Target amounts of the starting and reactant materials will be copied by default.
          The amounts (real and target) of the product materials can not be copied.
          <br />
        </Modal.Body>
        <Modal.Footer className="border-0">
          <OverlayTrigger
            placement="bottom"
            overlay={(
              <Tooltip id="copy-modal-yes-tooltip">
                Real amounts of starting materials, reactants, and solvents will be preserved
              </Tooltip>
            )}
          >
            <Button className="w-100 btn btn-info" onClick={() => this.handleCopyReactionConfirm(true)}>
              Yes - copy target and real amounts
            </Button>
          </OverlayTrigger>

          <OverlayTrigger
            placement="bottom"
            overlay={(
              <Tooltip id="copy-modal-no-tooltip">
                Only target amounts will be copied, real amounts will be cleared
              </Tooltip>
            )}
          >
            <Button className="w-100 btn btn-info" onClick={() => this.handleCopyReactionConfirm(false)}>
              No - only copy the target amounts
            </Button>
          </OverlayTrigger>
        </Modal.Footer>
      </Modal>
    );
  }

  isCopyCellLineDisabled() {
    let cellLineId = this.getCellLineId();
    return !cellLineId;
  }

  copyCellLine() {
    let uiState = UIStore.getState();
    let cellLineId = this.getCellLineId();
    ElementActions.copyCellLineFromId(parseInt(cellLineId), uiState.currentCollection.id);
  }

  getDeviceDescriptionFilter() {
    let uiState = UIStore.getState();
    return this.filterParamsFromUIStateByElementType(uiState, "device_description");
  }

  isCopyDeviceDescriptionDisabled() {
    let deviceDescriptionFilter = this.getDeviceDescriptionFilter();
    return !deviceDescriptionFilter.all && deviceDescriptionFilter.included_ids.size == 0;
  }

  copyDeviceDescription() {
    let deviceDescriptionFilter = this.getDeviceDescriptionFilter();
    // Set limit to 1 because we are only interested in one device description
    let params = {
      ui_state: deviceDescriptionFilter,
      limit: 1,
    }

    ClipboardActions.fetchDeviceDescriptionsByUIState(params, 'copy_device_description');
  }

  getSequenceBasedMacromoleculeSampleFilter() {
    let uiState = UIStore.getState();
    return this.filterParamsFromUIStateByElementType(uiState, "sequence_based_macromolecule_sample");
  }

  isCopySequenceBasedMacromoleculeSampleDisabled() {
    let sequenceBasedMacromoleculeSampleFilter = this.getSequenceBasedMacromoleculeSampleFilter();
    return !sequenceBasedMacromoleculeSampleFilter.all && sequenceBasedMacromoleculeSampleFilter.included_ids.size == 0;
  }

  copySequenceBasedMacromoleculeSample() {
    let sequenceBasedMacromoleculeSampleFilter = this.getSequenceBasedMacromoleculeSampleFilter();
    // Set limit to 1 because we are only interested in one sbmm sample
    let params = {
      ui_state: sequenceBasedMacromoleculeSampleFilter,
      limit: 1,
    }

    ClipboardActions.fetchSequenceBasedMacromoleculeSamplesByUIState(params, 'copy_sequence_based_macromolecule_sample');
  }

  createWellplateFromSamples() {
    let uiState = UIStore.getState();
    let sampleFilter = this.filterParamsFromUIStateByElementType(uiState, "sample");

    let params = {
      sample: sampleFilter
    }

    SamplesFetcher.fetchSamplesByUIStateAndLimit(params).then((result) => {
      const samples = result;
      const sampleCount = samples.length;
      if (sampleCount <= 96) {
        ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'template_wellplate');
      } else {
        const wellplateCount = Math.ceil(sampleCount / 96);

        this.setState({
          samples: samples,
          collectionId: sampleFilter.collection_id,
          modalProps: {
            show: true,
            sampleCount: sampleCount,
            wellplateCount: wellplateCount
          }
        });
      }
    });
  }

  handleModalHide() {
    this.setState({
      modalProps: {
        show: false
      }
    });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  bulkCreateWellplates() {
    const wellplateCount = this.wellplateInput.value;
    const { collectionId, samples } = this.state;

    ElementActions.bulkCreateWellplatesFromSamples({
      collection_id: collectionId,
      samples: samples,
      wellplateCount: wellplateCount
    });
    this.handleModalHide();
  }

  createWellplateModal() {
    const { modalProps } = this.state;

    return (
      <Modal centered animation={false} show={modalProps.show} onHide={() => this.handleModalHide()}>
        <Modal.Header closeButton>
          <Modal.Title>Create Wellplates from Samples</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You have selected {modalProps.sampleCount} samples. Please fill in the number of wellplates you would like to create.
          <p />
          <Form.Group controlId="wellplateInput">
            <Form.Label>Number of wellplates</Form.Label>
            <Form.Control
              type="text"
              ref={(input) => { this.wellplateInput = input; }}
              defaultValue={modalProps.wellplateCount || ''}
            />
          </Form.Group>

          <ButtonToolbar>
            <Button variant="primary" onClick={() => this.handleModalHide()}>Cancel</Button>
            <Button variant="warning" onClick={() => this.bulkCreateWellplates()}>Submit</Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    )
  }

  createScreenFromWellplates() {
    let uiState = UIStore.getState();
    let wellplateFilter = this.filterParamsFromUIStateByElementType(uiState, "wellplate");
    let params = {
      wellplate: wellplateFilter
    }
    ClipboardActions.fetchWellplatesByUIState(params, 'template_screen');
  }

  filterParamsFromUIStateByElementType(uiState, elementType) {
    let collectionId = uiState.currentCollection && uiState.currentCollection.id;

    return {
      all: uiState[elementType].checkedAll,
      included_ids: uiState[elementType].checkedIds,
      excluded_ids: uiState[elementType].uncheckedIds,
      collection_id: collectionId
    }
  }

  createElementOfType(type) {
    const { currentCollection, isSync } = UIStore.getState();
    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/new`
      : `/collection/${currentCollection.id}/${type}/new`;
    Aviator.navigate(uri, { silent: true });
    const e = { type: type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = 'new'
    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
    if (genericEls.find(el => el.name == type)) {
      e.klassType = 'GenericEl';
    }
    if (type === 'sample') {
      UIActions.selectTab(0);
    }
    elementShowOrNew(e);
  }

  createBtn(type) {
    let iconClass = `icon-${type}`;
    const genericEls = UserStore.getState().genericEls || [];
    if (!allElnElements.includes(type) && typeof genericEls !== 'undefined' && genericEls !== null && genericEls.length > 0) {
      const genericEl = (genericEls && genericEls.find(el => el.name == type)) || {};
      iconClass = `${genericEl.icon_name}`;
    }
    return (
      <div>
        <i className={`${iconClass} me-1`} />
        <i className="fa fa-plus" />
      </div>
    )
  }

  createVesselTemplate() {
    const { currentCollection, isSync } = UIStore.getState();
    const uri = isSync
      ? `/scollection/${currentCollection.id}/vessel_template/new`
      : `/collection/${currentCollection.id}/vessel_template/new`;

    Aviator.navigate(uri, { silent: true });

    const e = {
      type: 'vessel_template',
      params: {
        collectionID: currentCollection.id,
        vesselTemplateID: 'new'
      }
    };

    elementShowOrNew(e);
  }

  noWellplateSelected() {
    const { wellplate } = UIStore.getState();
    return wellplate.checkedIds.size == 0 && wellplate.checkedAll == false;
  }

  render() {
    const { isDisabled, layout } = this.state;
    const type = UserStore.getState().currentType;
    const itemTables = [];
    const sortedLayout = Object.entries(layout)
      .filter((o) => o[1] && o[1] > 0)
      .sort((a, b) => a[1] - b[1]);

    sortedLayout?.forEach(([sl]) => {
      const el = allElnElmentsWithLabel.concat(allGenericElements()).find((ael) => ael.name === sl);
      if (el) {
        itemTables.push(
          <Dropdown.Item
            id={`create-${el.name}-button`}
            key={el.name}
            onClick={() => this.createElementOfType(`${el.name}`)}
          >
            <i className={`me-1 icon-${el.name}`} />
            Create {el.label}
          </Dropdown.Item>
        );
      }
    });

    return (
      <Dropdown
        id="create-element-dropdown"
        drop="up"
        align="end"
        className="create-element-button"
      >
        <Dropdown.Toggle as={CreateElementDropdownToggle}
          disabled={isDisabled}
        />
        <Dropdown.Menu className="shadow">
          {this.createWellplateModal()}
          {this.copyReactionAmountsModal()}
          {itemTables}

          <Dropdown.Divider />
          <Dropdown.Item onClick={() => this.createWellplateFromSamples()}>
            <i className="me-1 icon-wellplate" />
            Create Wellplate from Samples
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.createScreenFromWellplates()}>
            <i className="me-1 icon-screen" />
            Create Screen from Wellplates
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.createVesselTemplate()}>
            <i className="me-1 icon-vessel" />
            Create Vessel Template
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={() => this.copySample()} disabled={this.isCopySampleDisabled()}>
            <i className="me-1 icon-sample" />
            Copy Sample
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.copyReaction()} disabled={this.isCopyReactionDisabled()}>
            <i className="me-1 icon-reaction" />
            Copy Reaction
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.copyCellLine()} disabled={this.isCopyCellLineDisabled()}>
            <i className="me-1 icon-cell_line" />
            Copy Cell line
          </Dropdown.Item>
          <Dropdown.Item onClick={() => this.copyDeviceDescription()} disabled={this.isCopyDeviceDescriptionDisabled()}>
            <i className="me-1 icon-device_description" />
            Copy Device Description
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => this.copySequenceBasedMacromoleculeSample()}
            disabled={this.isCopySequenceBasedMacromoleculeSampleDisabled()}
          >
            <i className="me-1 icon-sequence_based_macromolecule_sample" />
            Copy Sequence Based Macromolecule
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}
