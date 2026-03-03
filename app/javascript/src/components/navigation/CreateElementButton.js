import React from 'react';
import PropTypes from 'prop-types';
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
import UIActions from 'src/stores/alt/actions/UIActions';

const CreateElementDropdownToggle = React.forwardRef(({ onClick }, ref) => (
  <Button
    variant="success"
    className="rounded-circle shadow"
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
  >
    <i className="fa fa-plus" />
  </Button>
));

CreateElementDropdownToggle.displayName = 'CreateElementDropdownToggle';
CreateElementDropdownToggle.propTypes = {
  onClick: PropTypes.func.isRequired
};

export default class CreateElementButton extends React.Component {
  static filterParamsFromUIStateByElementType(uiState, elementType) {
    const collectionId = uiState.currentCollection && uiState.currentCollection.id;

    return {
      all: uiState[elementType].checkedAll,
      included_ids: uiState[elementType].checkedIds,
      excluded_ids: uiState[elementType].uncheckedIds,
      collection_id: collectionId
    };
  }

  static createScreenFromWellplates() {
    const uiState = UIStore.getState();
    const wellplateFilter = CreateElementButton.filterParamsFromUIStateByElementType(uiState, 'wellplate');
    const params = {
      wellplate: wellplateFilter
    };
    ClipboardActions.fetchWellplatesByUIState(params, 'template_screen');
  }

  static createBtn(type) {
    let iconClass = `icon-${type}`;
    const genericEls = UserStore.getState().genericEls || [];
    if (!allElnElements.includes(type) && typeof genericEls !== 'undefined'
      && genericEls !== null && genericEls.length > 0) {
      const genericEl = (genericEls && genericEls.find((el) => el.name === type)) || {};
      iconClass = `${genericEl.icon_name}`;
    }
    return (
      <div>
        <i className={`${iconClass} me-1`} />
        <i className="fa fa-plus" />
      </div>
    );
  }

  static createElementOfType(type) {
    const { currentCollection, isSync } = UIStore.getState();
    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/new`
      : `/collection/${currentCollection.id}/${type}/new`;
    Aviator.navigate(uri, { silent: true });
    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = 'new';
    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
    if (genericEls.find((el) => el.name === type)) {
      e.klassType = 'GenericEl';
    }
    if (type === 'sample') {
      UIActions.selectTab(0);
    }
    elementShowOrNew(e);
  }

  static createVesselTemplate() {
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
    };

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

  handleCopyReactionConfirm(keepAmounts) {
    const { pendingReactionId } = this.state;
    this.setState({ showCopyReactionModal: false, pendingReactionId: null });
    ElementActions.copyReactionFromId(pendingReactionId, keepAmounts);
  }

  handleCopyReactionModalClose() {
    this.setState({ showCopyReactionModal: false, pendingReactionId: null });
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

  createWellplateFromSamples() {
    const uiState = UIStore.getState();
    const sampleFilter = CreateElementButton.filterParamsFromUIStateByElementType(uiState, 'sample');

    const params = {
      sample: sampleFilter
    };

    SamplesFetcher.fetchSamplesByUIStateAndLimit(params).then((result) => {
      const samples = result;
      const sampleCount = samples.length;
      if (sampleCount <= 96) {
        ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'template_wellplate');
      } else {
        const wellplateCount = Math.ceil(sampleCount / 96);

        this.setState({
          samples,
          collectionId: sampleFilter.collection_id,
          modalProps: {
            show: true,
            sampleCount,
            wellplateCount
          }
        });
      }
    });
  }

  bulkCreateWellplates() {
    const wellplateCount = this.wellplateInput.value;
    const { collectionId, samples } = this.state;

    ElementActions.bulkCreateWellplatesFromSamples({
      collection_id: collectionId,
      samples,
      wellplateCount
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
          You have selected
          {modalProps.sampleCount}
          {' samples. Please fill in the number of wellplates you would like to create.'}
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
    );
  }

  render() {
    const { isDisabled, layout } = this.state;
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
            onClick={() => CreateElementButton.createElementOfType(el.name)}
          >
            <i className={`me-1 icon-${el.name}`} />
            {`Create ${el.label}`}
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
        <Dropdown.Toggle
          as={CreateElementDropdownToggle}
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
          <Dropdown.Item onClick={() => CreateElementButton.createScreenFromWellplates()}>
            <i className="me-1 icon-screen" />
            Create Screen from Wellplates
          </Dropdown.Item>
          <Dropdown.Item onClick={() => CreateElementButton.createVesselTemplate()}>
            <i className="me-1 icon-vessel" />
            Create Vessel Template
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}
