import React, { useContext, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, Dropdown
} from 'react-bootstrap';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { allElnElmentsWithLabel } from 'src/apps/generic/Utils';
import { aviatorNavigation } from 'src/utilities/routesUtils';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import AppModal from 'src/components/common/AppModal';
import ElementIcon from 'src/components/common/ElementIcon';
import { reaction } from 'mobx';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const CreateElementDropdownToggle = React.forwardRef(({ onClick, disabled }, ref) => (
  <Button
    variant="create"
    className="create-element-button"
    ref={ref}
    disabled={disabled}
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
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const filterParamsFromUIStateByElementType = (elementType) => {
  const uiState = UIStore.getState();
  const collectionId = uiState.currentCollection && uiState.currentCollection.id;

  return {
    all: uiState[elementType].checkedAll,
    included_ids: uiState[elementType].checkedIds,
    excluded_ids: uiState[elementType].uncheckedIds,
    collection_id: collectionId
  };
};

const createElementOfType = (type) => {
  aviatorNavigation(type, 'new', true, true);
};

const CreateElementButton = () => {
  const { userStore } = useContext(StoreContext);

  const createScreenFromWellplates = () => {
    const wellplateFilter = filterParamsFromUIStateByElementType('wellplate');
    const params = {
      wellplate: wellplateFilter
    };
    ClipboardActions.fetchWellplatesByUIState(params, 'template_screen');
  };

  const [isDisabled, setIsDisabled] = useState(true);
  const [samples, setSamples] = useState([]);
  const [collectionId, setCollectionId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [wellplateCount, setWellplateCount] = useState(0);
  const layout = userStore.profile?.data?.layout || {};

  reaction(
    // function that returns the data to observe
    () => {
      const { currentCollection } = UIStore.getState();
      if (!currentCollection) { return null; }

      const { label, is_locked, collection_share_id, permission_level } = currentCollection;
      return {
        label,
        is_locked,
        collection_share_id,
        permission_level
      };
    },
    // what to do when data changes
    (changesInCurrentCollection) => {
      if (changesInCurrentCollection == null) {
        setIsDisabled(true);
        return;
      }

      const { label, is_locked, collection_share_id, permission_level } = changesInCurrentCollection;

      // Creating an element adds it to the collection, so it needs AddElements — not merely EditElements.
      const newIsDisabled = permission_level !== undefined
        ? (collection_share_id && permission_level < PermissionConst.AddElements)
        : (label === 'All' && is_locked);

      setIsDisabled(newIsDisabled);
    }
  );

  const hideModal = () => {
    setShowModal(false);
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  };

  const createWellplateFromSamples = () => {
    const sampleFilter = filterParamsFromUIStateByElementType('sample');

    const params = {
      sample: sampleFilter
    };

    SamplesFetcher.fetchSamplesByUIStateAndLimit(params).then((result) => {
      const samplesFromServer = result;
      const sampleCountFromServer = samplesFromServer.length;
      if (sampleCountFromServer <= 96) {
        ClipboardActions.fetchSamplesByUIStateAndLimit(params, 'template_wellplate');
      } else {
        const wellplateCountFromServer = Math.ceil(sampleCount / 96);

        setSamples(samplesFromServer);
        setCollectionId(sampleFilter.collection_id);
        setShowModal(true);
        setSampleCount(sampleCountFromServer);
        setWellplateCount(wellplateCountFromServer);
      }
    });
  };

  const bulkCreateWellplates = () => {
    ElementActions.bulkCreateWellplatesFromSamples({
      collection_id: collectionId,
      samples,
      wellplateCount
    });
    hideModal();
  };

  const createWellplateModal = () => (
    <AppModal
      animation={false}
      show={showModal}
      onHide={hideModal}
      title="Create Wellplates from Samples"
      closeLabel="Cancel"
      primaryActionLabel="Submit"
      onPrimaryAction={bulkCreateWellplates}
    >
      <div>
        You have selected
        {sampleCount}
        {' samples. Please fill in the number of wellplates you would like to create.'}
        <Form.Group controlId="wellplateInput">
          <Form.Label>Number of wellplates</Form.Label>
          <Form.Control
            type="text"
            onChange={(value) => setWellplateCount(value) }
            defaultValue={wellplateCount || ''}
          />
        </Form.Group>
      </div>
    </AppModal>
  );

  const itemTables = [];
  const sortedLayout = Object.entries(layout)
    .filter((o) => o[1] && o[1] > 0)
    .sort((a, b) => a[1] - b[1]);

  sortedLayout?.forEach(([sl]) => {
    const el = allElnElmentsWithLabel.concat(userStore.allGenericElements()).find((ael) => ael.name === sl);
    if (el) {
      itemTables.push(
        <Dropdown.Item
          id={`create-${el.name}-button`}
          key={el.name}
          onClick={() => createElementOfType(el.name)}
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
        {createWellplateModal()}
        {itemTables}

        <Dropdown.Divider />
        <Dropdown.Item onClick={createWellplateFromSamples}>
          <i className="me-1 icon-wellplate" />
          Create Wellplate from Samples
        </Dropdown.Item>
        <Dropdown.Item onClick={createScreenFromWellplates}>
          <i className="me-1 icon-screen" />
          Create Screen from Wellplates
        </Dropdown.Item>
        <Dropdown.Item onClick={() => createElementOfType('vessel_template')}>
          <i className="me-1 icon-vessel" />
          Create Vessel Template
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default observer(CreateElementButton);
