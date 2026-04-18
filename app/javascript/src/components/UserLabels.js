/* eslint-disable camelcase */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import {
  Badge,
  Button,
  Form,
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import ColorLabel from 'src/components/common/ColorLabel';
import { Select } from 'src/components/common/Select';
import { colorOptions } from 'src/components/staticDropdownOptions/options';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UserStore from 'src/stores/alt/stores/UserStore';

function UserLabel({ title, color, access_level }) {
  return (
    <Badge
      bg="custom"
      style={{
        backgroundColor: color,
        borderRadius: access_level === 2 ? '0.25em' : '10px',
      }}
    >
      {title}
    </Badge>
  );
}

UserLabel.propTypes = {
  title: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  access_level: PropTypes.number.isRequired,
};

const editableElementShape = PropTypes.shape({
  setUserLabels: PropTypes.func.isRequired,
  user_labels: PropTypes.arrayOf(PropTypes.number),
});

const taggedElementShape = PropTypes.shape({
  tag: PropTypes.shape({
    taggable_data: PropTypes.shape({
      user_labels: PropTypes.arrayOf(PropTypes.number),
    }),
  }),
});

function filterAvailableLabels(labels, currentUser) {
  return (labels || []).filter(
    (currentLabel) => currentLabel.access_level === 2 || currentLabel.user_id === currentUser?.id,
  );
}

function renderUserLabelCell(node) {
  const {
    title,
    color,
    access_level,
  } = node.data;

  return (
    <UserLabel
      title={title}
      color={color}
      access_level={access_level}
    />
  );
}

function renderAccessLabelCell(node) {
  switch (node.data.access_level) {
    case 0:
      return 'Private';
    case 1:
      return 'Public';
    default:
      return '';
  }
}

function renderColorOptionLabel(option) {
  return <ColorLabel color={option.value} label={option.label} />;
}

function UserLabelModal({ showLabelModal, onHide }) {
  const [labels, setLabels] = useState([]);
  const [label, setLabel] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  const handleStoreChange = useCallback((state) => {
    const { currentUser, labels: storeLabels } = state;
    setLabels(filterAvailableLabels(storeLabels, currentUser));
  }, []);

  useEffect(() => {
    UserStore.listen(handleStoreChange);
    UserActions.fetchUserLabels();

    return () => {
      UserStore.unlisten(handleStoreChange);
    };
  }, [handleStoreChange]);

  const handleEditLabelClick = useCallback((nextLabel) => {
    setLabel(nextLabel);
    setShowDetails(true);
  }, []);

  const handleColorPicker = useCallback((option) => {
    const color = option?.value || null;
    setLabel((currentLabel) => ({
      ...currentLabel,
      color,
    }));
  }, []);

  const handleAccessChange = useCallback(({ value }) => {
    setLabel((currentLabel) => ({
      ...currentLabel,
      access_level: value,
    }));
  }, []);

  const handleFieldChange = useCallback((field) => (event) => {
    const { value } = event.target;
    setLabel((currentLabel) => ({
      ...currentLabel,
      [field]: value,
    }));
  }, []);

  const handleBackButton = useCallback(() => {
    setShowDetails(false);
  }, []);

  const handleSaveLabel = useCallback(() => {
    const nextLabel = {
      ...label,
      title: label.title || '',
      description: label.description || '',
      color: label.color || '',
    };

    if (!nextLabel.title.trim() || !nextLabel.color.trim()) {
      NotificationActions.removeByUid('createUserLabel');
      NotificationActions.add({
        title: 'Create User Label',
        message: 'Title or color is empty',
        level: 'error',
        dismissible: 'button',
        autoDismiss: 5,
        position: 'tr',
        uid: 'createUserLabel',
      });
      return;
    }

    UsersFetcher.updateUserLabel({
      id: nextLabel.id,
      title: nextLabel.title,
      access_level: nextLabel.access_level === true || nextLabel.access_level === 1 ? 1 : 0,
      description: nextLabel.description,
      color: nextLabel.color,
    }).then(() => {
      UserActions.fetchUserLabels();
      setShowDetails(false);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }, [label]);

  const handleNewLabel = useCallback(() => {
    setLabel({});
    setShowDetails(true);
  }, []);

  const renderActions = useCallback((node) => (
    <Button
      size="sm"
      disabled={node.data.access_level === 2}
      variant="light"
      onClick={() => handleEditLabelClick(node.data)}
    >
      {node.data.access_level === 2 ? 'Global' : 'Edit'}
    </Button>
  ), [handleEditLabelClick]);

  const columnDefs = useMemo(() => ([
    {
      headerName: 'Label',
      minWidth: 100,
      maxWidth: 100,
      cellRenderer: renderUserLabelCell,
    },
    {
      headerName: 'Access',
      minWidth: 70,
      maxWidth: 70,
      cellRenderer: renderAccessLabelCell,
    },
    {
      headerName: 'Description',
      field: 'description',
      wrapText: true,
      cellClass: ['lh-base', 'p-2', 'border-end'],
    },
    {
      headerName: 'Color',
      field: 'color',
      minWidth: 80,
      maxWidth: 80,
    },
    {
      headerName: 'Action',
      minWidth: 60,
      maxWidth: 60,
      cellRenderer: renderActions,
      cellClass: ['p-2'],
    },
  ]), [renderActions]);

  const defaultColDef = useMemo(() => ({
    editable: false,
    flex: 1,
    autoHeight: true,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    cellClass: ['border-end', 'px-2'],
    headerClass: ['border-end', 'px-2'],
  }), []);

  const accessList = useMemo(() => ([
    { label: 'Private - Exclusive access for you', value: 0 },
    { label: 'Public - Shareable before publication, Visible to all after', value: 1 },
  ]), []);

  const selectedColor = useMemo(
    () => colorOptions.find(({ value }) => value === label.color) || null,
    [label.color],
  );

  const extendedFooter = showDetails ? (
    <Button variant="secondary" onClick={handleBackButton}>Back</Button>
  ) : undefined;

  const modalBody = showDetails ? (
    <Form horizontal>
      <Form.Group controlId="accessLevelInput" className="mb-2">
        <Form.Label>
          Public?
        </Form.Label>
        <Select
          name="userLabel"
          options={accessList}
          onChange={handleAccessChange}
          value={accessList.find(({ value }) => value === label.access_level)}
        />
      </Form.Group>
      <Form.Group controlId="titleInput" className="mb-2">
        <Form.Label>
          Title
        </Form.Label>
        <Form.Control
          type="text"
          value={label.title || ''}
          onChange={handleFieldChange('title')}
        />
      </Form.Group>
      <Form.Group controlId="descInput" className="mb-2">
        <Form.Label>
          Description
        </Form.Label>
        <Form.Control
          type="text"
          value={label.description || ''}
          onChange={handleFieldChange('description')}
        />
      </Form.Group>
      <Form.Group controlId="colorInput">
        <Form.Label>Background Color</Form.Label>
        <Select
          className="rounded-corners"
          name="colorPicker"
          isClearable
          options={colorOptions}
          value={selectedColor}
          onChange={handleColorPicker}
          getOptionLabel={renderColorOptionLabel}
          maxHeight="200px"
          placeholder="Choose a color..."
        />
      </Form.Group>
    </Form>
  ) : (
    <div className="ag-theme-alpine">
      <AgGridReact
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={labels}
        rowHeight="auto"
        domLayout="autoHeight"
        autoSizeStrategy={{ type: 'fitGridWidth' }}
      />
    </div>
  );

  return (
    <AppModal
      title="My labels"
      show={showLabelModal}
      onHide={onHide}
      size={showDetails ? undefined : 'lg'}
      closeLabel="Close"
      extendedFooter={extendedFooter}
      primaryActionLabel={showDetails ? 'Save' : 'Create'}
      onPrimaryAction={showDetails ? handleSaveLabel : handleNewLabel}
    >
      {modalBody}
    </AppModal>
  );
}

UserLabelModal.propTypes = {
  showLabelModal: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};
function EditUserLabels({ element, fnCb }) {
  const [currentUser, setCurrentUser] = useState(() => UserStore.getState().currentUser || {});
  const [labelOptions, setLabelOptions] = useState(() => UserStore.getState().labels || []);

  const handleStoreChange = useCallback((state) => {
    setCurrentUser(state.currentUser || {});
    setLabelOptions(state.labels || []);
  }, []);

  useEffect(() => {
    UserStore.listen(handleStoreChange);

    return () => {
      UserStore.unlisten(handleStoreChange);
    };
  }, [handleStoreChange]);

  const handleSelectChange = useCallback((values) => {
    const ids = (values || []).map((currentLabel) => currentLabel.id);
    element.setUserLabels(ids);
    fnCb(element);
  }, [element, fnCb]);

  const currentLabelIds = element.user_labels || [];
  const selectedLabels = labelOptions.filter((currentLabel) => (
    currentLabelIds.includes(currentLabel.id)
    && (currentLabel.access_level > 0 || currentLabel.user_id === currentUser.id)
  ));
  const options = filterAvailableLabels(labelOptions, currentUser);

  return (
    <Form.Group>
      <Form.Label>My labels</Form.Label>
      <Select
        isMulti
        options={options}
        getOptionValue={(currentLabel) => currentLabel.id}
        getOptionLabel={(currentLabel) => currentLabel.title}
        formatOptionLabel={UserLabel}
        value={selectedLabels}
        onChange={handleSelectChange}
      />
    </Form.Group>
  );
}

EditUserLabels.propTypes = {
  element: editableElementShape.isRequired,
  fnCb: PropTypes.func.isRequired,
};
function ShowUserLabels({ element }) {
  const [currentUser, setCurrentUser] = useState(() => UserStore.getState().currentUser || {});
  const [labelOptions, setLabelOptions] = useState(() => UserStore.getState().labels || []);

  const handleStoreChange = useCallback((state) => {
    setCurrentUser(state.currentUser || {});
    setLabelOptions(state.labels || []);
  }, []);

  useEffect(() => {
    UserStore.listen(handleStoreChange);

    return () => {
      UserStore.unlisten(handleStoreChange);
    };
  }, [handleStoreChange]);

  const currentLabelIds = element?.tag?.taggable_data?.user_labels || [];
  const visibleLabels = labelOptions.filter((currentLabel) => (
    currentLabelIds.includes(currentLabel.id)
    && (currentLabel.access_level > 0 || currentLabel.user_id === currentUser.id)
  ));

  return visibleLabels.map((currentLabel) => (
    <UserLabel
      key={currentLabel.id}
      title={currentLabel.title}
      color={currentLabel.color}
      access_level={currentLabel.access_level}
    />
  ));
}

ShowUserLabels.propTypes = {
  element: taggedElementShape.isRequired,
};
function SearchUserLabels({ fnCb, userLabel, size }) {
  const [currentUser, setCurrentUser] = useState(() => UserStore.getState().currentUser || {});
  const [labels, setLabels] = useState(() => UserStore.getState().labels || []);

  const handleStoreChange = useCallback((state) => {
    setCurrentUser(state.currentUser || {});
    setLabels(state.labels || []);
  }, []);

  useEffect(() => {
    UserStore.listen(handleStoreChange);

    return () => {
      UserStore.unlisten(handleStoreChange);
    };
  }, [handleStoreChange]);

  const handleSelectChange = useCallback((value) => {
    fnCb(value?.id ?? null);
  }, [fnCb]);

  const options = filterAvailableLabels(labels, currentUser);
  const selectedLabel = labels.find((currentLabel) => currentLabel.id === userLabel) || null;

  return (
    <Select
      isClearable
      options={options}
      getOptionValue={(currentLabel) => currentLabel.id}
      getOptionLabel={(currentLabel) => currentLabel.title}
      formatOptionLabel={UserLabel}
      value={selectedLabel}
      onChange={handleSelectChange}
      placeholder="Filter by label"
      minWidth="100px"
      size={size}
    />
  );
}

SearchUserLabels.propTypes = {
  fnCb: PropTypes.func.isRequired,
  userLabel: PropTypes.number,
  size: PropTypes.string,
};

SearchUserLabels.defaultProps = {
  userLabel: null,
  size: 'md',
};

export {
  UserLabelModal,
  EditUserLabels,
  ShowUserLabels,
  SearchUserLabels,
};
