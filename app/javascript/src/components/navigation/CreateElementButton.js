import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, Dropdown
} from 'react-bootstrap';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { allElnElements, allElnElmentsWithLabel, allGenericElements } from 'src/apps/generic/Utils';
import { aviatorNavigation } from 'src/utilities/routesUtils';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import AppModal from 'src/components/common/AppModal';
import ElementIcon from 'src/components/common/ElementIcon';

const CreateElementDropdownToggle = React.forwardRef(({ onClick }, ref) => (
  <Button
    variant="create"
    className="create-element-button"
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
  >
    <i className="fa fa-plus me-1 create-element-button__icon" />
    <span className="create-element-button__label">Create</span>
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
    const genericEls = UserStore.getState().genericEls || [];
    const genericEl = !allElnElements.includes(type)
      ? genericEls.find((el) => el.name === type)
      : null;
    const element = genericEl || { type };

    return (
      <div>
        <ElementIcon element={element} className="me-1" />
        <i className="fa fa-plus" />
      </div>
    );
  }

  static createElementOfType(type) {
    aviatorNavigation(type, 'new', true, true);
  }

  static createVesselTemplate() {
    aviatorNavigation('vessel_template', 'new', true, true);
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
      }
    };

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
      collection_share_id,
      permission_level
    } = currentCollection;

    const newIsDisabled = permission_level !== undefined
      ? (collection_share_id && permission_level < PermissionConst.Write)
      : (label === 'All' && is_locked);

    this.setState({ isDisabled: newIsDisabled });
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
      <AppModal
        animation={false}
        show={modalProps.show}
        onHide={() => this.handleModalHide()}
        title="Create Wellplates from Samples"
        closeLabel="Cancel"
        primaryActionLabel="Submit"
        onPrimaryAction={() => this.bulkCreateWellplates()}
      >
        <div>
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
        </div>
      </AppModal>
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
            <ElementIcon element={{ ...el, type: el.name }} className="me-1" />
            {`Create ${el.label}`}
          </Dropdown.Item>
        );
      }
    });

    return (
      <Dropdown
        className="create-element-dropdown"
        id="create-element-dropdown"
        drop="up"
        align="end"
      >
        <Dropdown.Toggle
          as={CreateElementDropdownToggle}
          disabled={isDisabled}
        />
        <Dropdown.Menu className="shadow">
          {this.createWellplateModal()}
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
