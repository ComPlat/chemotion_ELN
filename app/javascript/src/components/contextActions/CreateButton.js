import React from 'react';
import PropTypes from 'prop-types';
import {
  SplitButton, Button, ButtonToolbar, Form, Modal, Dropdown
} from 'react-bootstrap';
import Aviator from 'aviator';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import MatrixCheck from 'src/components/common/MatrixCheck';

const elementList = () => {
  const elements = [
    { name: 'sample', label: 'Sample' },
    { name: 'reaction', label: 'Reaction' },
    { name: 'wellplate', label: 'Wellplate' },
    { name: 'screen', label: 'Screen' },
    { name: 'research_plan', label: 'Research Plan' },
    { name: 'cell_line', label: 'Cell Line' },
    { name: 'device_description', label: 'Device Description' }
  ];
  let genericEls = [];
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};

  if (MatrixCheck(currentUser.matrix, 'genericElement')) {
    genericEls = UserStore.getState().genericEls || [];
  }

  return { elements, genericEls };
};

export default class CreateButton extends React.Component {
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
      }
    }

    this.createBtn = this.createBtn.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
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
    let reactionId = this.getReactionId();
    ElementActions.copyReactionFromId(reactionId);
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
    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = 'new'
    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
    if (genericEls.find(el => el.name == type)) {
      e.klassType = 'GenericEl';
    }
    elementShowOrNew(e);
  }

  createBtn(type) {
    let iconClass = `icon-${type}`;
    const genericEls = UserStore.getState().genericEls || [];
    const constEls = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan', 'cell_line', 'device_description'];
    if (!constEls.includes(type) && typeof genericEls !== 'undefined' && genericEls !== null && genericEls.length > 0) {
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

  noWellplateSelected() {
    const { wellplate } = UIStore.getState();
    return wellplate.checkedIds.size == 0 && wellplate.checkedAll == false;
  }

  render() {
    const { customClass } = this.props;
    const { isDisabled, layout } = this.state;
    const type = UserStore.getState().currentType;
    const { elements, genericEls } = elementList();
    const sortedLayout = Object.entries(layout)
      .filter((o) => o[1] && o[1] > 0)
      .sort((a, b) => a[1] - b[1]);

    const sortedGenericEls = [];
    sortedLayout.forEach(([sl]) => {
      const el = elements.concat(genericEls).find((ael) => ael.name === sl);
      if (typeof el !== 'undefined') {
        sortedGenericEls.push(el);
      }
    });

    return (
      <SplitButton
        id="create-split-button"
        variant={customClass ? null : 'primary'}
        className={customClass}
        title={this.createBtn(type)}
        disabled={isDisabled}
        onClick={() => this.createElementOfType(type)}
      >
        {this.createWellplateModal()}
        {sortedGenericEls.map((el) => (
          <Dropdown.Item
            key={el.name}
            id={`create-${el.name}-button`}
            onClick={() => this.createElementOfType(el.name)}
          >
            {`Create ${el.label}`}
          </Dropdown.Item>
        ))}
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => this.createWellplateFromSamples()}>
          Create Wellplate from Samples
        </Dropdown.Item>
        <Dropdown.Item onClick={() => this.createScreenFromWellplates()}>
          Create Screen from Wellplates
        </Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={() => this.copySample()} disabled={this.isCopySampleDisabled()}>
          Copy Sample
        </Dropdown.Item>
        <Dropdown.Item onClick={() => this.copyReaction()} disabled={this.isCopyReactionDisabled()}>
          Copy Reaction
        </Dropdown.Item>
        <Dropdown.Item onClick={() => this.copyCellLine()} disabled={this.isCopyCellLineDisabled()}>
          Copy Cell line
        </Dropdown.Item>
        <Dropdown.Item onClick={() => this.copyDeviceDescription()} disabled={this.isCopyDeviceDescriptionDisabled()}>
          Copy Device Description
        </Dropdown.Item>
      </SplitButton>
    );
  }
}

CreateButton.propTypes = {
  customClass: PropTypes.string,
};

CreateButton.defaultProps = {
  customClass: null,
};
