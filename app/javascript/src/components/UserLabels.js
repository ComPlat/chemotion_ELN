/* eslint-disable react/destructuring-assignment */
/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Badge, Button, Form, InputGroup, ButtonToolbar, Row, Col
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { AgGridReact } from 'ag-grid-react';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import { colorOptions } from 'src/components/staticDropdownOptions/options';

/* eslint-disable camelcase */
const UserLabel = ({ title, color, access_level }) => (
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

UserLabel.propTypes = {
  title: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  access_level: PropTypes.number.isRequired,
};

class UserLabelModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      labels: [],
      label: {},
      showDetails: false,
      defaultColor: '#428BCA',
    };
    this.onChange = this.onChange.bind(this);
    this.handelNewLabel = this.handelNewLabel.bind(this);
    this.handleSaveLabel = this.handleSaveLabel.bind(this);
    this.handleBackButton = this.handleBackButton.bind(this);
    this.handleAccessChange = this.handleAccessChange.bind(this);
    this.handleColorPicker = this.handleColorPicker.bind(this);
    this.handleEditLabelClick = this.handleEditLabelClick.bind(this);
    this.renderActions = this.renderActions.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchUserLabels();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  handleEditLabelClick(e, label) {
    this.setState({ showDetails: true, label });
  }

  handleColorPicker(option) {
    const { label } = this.state;
    const hex = option?.value || null;
    this.setState({
      label: { ...label, color: hex },
    });
  }

  handleAccessChange({ value }) {
    const { label } = this.state;
    this.setState({
      label: { ...label, access_level: value },
    });
  }

  handleBackButton() {
    this.setState({
      showDetails: false
    });
  }

  handleSaveLabel() {
    const { label } = this.state;
    if (typeof (this.titleInput) !== 'undefined' && this.titleInput) {
      label.title = this.titleInput.value;
    }
    if (typeof (this.descInput) !== 'undefined' && this.descInput) {
      label.description = this.descInput.value;
    }
    if (
      label.title != null
      && label.title.trim().length !== 0
      && label.color != null
      && label.color.trim().length !== 0
    ) {
      UsersFetcher.updateUserLabel({
        id: label.id,
        title: label.title,
        access_level: (label.access_level === true || label.access_level === 1) ? 1 : 0,
        description: label.description,
        color: label.color
      }).then(() => {
        UserActions.fetchUserLabels();
        this.setState({
          showDetails: false
        });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    } else {
      NotificationActions.removeByUid('createUserLabel');
      const notification = {
        title: 'Create User Label',
        message: 'Title or color is empty',
        level: 'error',
        dismissible: 'button',
        autoDismiss: 5,
        position: 'tr',
        uid: 'createUserLabel'
      };
      NotificationActions.add(notification);
    }
  }

  onChange(state) {
    const { currentUser, labels } = state;
    const list = (labels || []).filter(
      (r) => r.access_level === 2 || r.user_id === (currentUser && currentUser.id)
    );

    this.setState({
      labels: list,
    });
  }

  handelNewLabel() {
    this.setState({
      label: {},
      showDetails: true,
    });
  }

  renderUserLabel(node) {
    return (<UserLabel {...node.data} />);
  }

  renderAccessLabel(node) {
    let accessLabel = '';
    switch (node.data.access_level) {
      case 0:
        accessLabel = 'Private';
        break;
      case 1:
        accessLabel = 'Public';
        break;
    }
    return accessLabel;
  }

  renderActions(node) {
    return (
      <Button
        size="sm"
        disabled={node.data.access_level === 2}
        variant={node.data.access_level === 2 ? 'light' : 'success'}
        onClick={(e) => this.handleEditLabelClick(e, node.data)}
      >
        {node.data.access_level === 2 ? 'Global' : 'Edit'}
      </Button>
    );
  }

  renderLabels() {
    const { showDetails, labels } = this.state;
    if (showDetails === true) {
      return this.renderLabel();
    }

    const columnDefs = [
      {
        headerName: "Label",
        minWidth: 100,
        maxWidth: 100,
        cellRenderer: this.renderUserLabel,
      },
      {
        headerName: "Access",
        minWidth: 70,
        maxWidth: 70,
        cellRenderer: this.renderAccessLabel,
      },
      {
        headerName: "Description",
        field: "description",
        wrapText: true,
        cellClass: ["lh-base", "p-2", "border-end"],
      },
      {
        headerName: "Color",
        field: "color",
        minWidth: 80,
        maxWidth: 80,
      },
      {
        headerName: "Action",
        minWidth: 55,
        maxWidth: 55,
        cellRenderer: this.renderActions,
        cellClass: ["p-2"],
      },
    ];

    const defaultColDef = {
      editable: false,
      flex: 1,
      autoHeight: true,
      sortable: false,
      resizable: false,
      suppressMovable: true,
      cellClass: ["border-end", "px-2"],
      headerClass: ["border-end", "px-2"]
    };

    return (
      <div className="ag-theme-alpine">
        <h3 className="pb-2">
          <Button variant="primary" size="md" onClick={() => this.handelNewLabel()}>
            <i className="fa fa-plus me-1" />
            Create
          </Button>
        </h3>
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowData={labels || []}
          rowHeight="auto"
          domLayout="autoHeight"
          autoSizeStrategy={{ type: 'fitGridWidth' }}
        />
      </div>
    );
  }

  renderOptionLabel(option) {
    return (
      <div className="d-flex align-items-center">
        <div className="label-color-preview me-2 rounded-circle" style={{ backgroundColor: option.value }} />
        {option.label}
      </div>
    );
  }

  renderLabel() {
    const { label } = this.state;
    const bcStyle = {
      backgroundColor: label.color || this.state.defaultColor
    };
    const accessList = [
      { label: 'Private - Exclusive access for you', value: 0 },
      { label: 'Public - Shareable before publication, Visible to all after', value: 1 }
    ];

    return (
      <Form horizontal>
        <Form.Group controlId="accessLevelInput" className="mb-2">
          <Form.Label>
            Public?
          </Form.Label>
          <Select
            name="userLabel"
            options={accessList}
            onChange={this.handleAccessChange}
            value={accessList.find(({ value }) => value === label.access_level)}
          />
        </Form.Group>
        <Form.Group controlId="titleInput" className="mb-2">
          <Form.Label>
            Title
          </Form.Label>
          <Form.Control
            type="text"
            ref={(m) => { this.titleInput = m; }}
            defaultValue={label.title || ''}
          />
        </Form.Group>
        <Form.Group controlId="descInput" className="mb-2">
          <Form.Label>
            Description
          </Form.Label>
          <Form.Control
            type="text"
            ref={(m) => { this.descInput = m; }}
            defaultValue={label.description || ''}
          />
        </Form.Group>
        <Form.Group controlId="colorInput" as={Row}>
          <Form.Label>Background Color</Form.Label>
          <Col xs="auto" className="pe-0">
            <div className="color-preview-box" style={{ backgroundColor: label.color || "#fff" }} />
          </Col>
          <Col className="ps-0">
            <Select
              className="rounded-corners"
              name="colorPicker"
              isClearable
              ref={(m) => { this.colorInput = m; }}
              options={colorOptions}
              value={colorOptions.find(({ value }) => value === label.color) || null}
              onChange={this.handleColorPicker}
              getOptionLabel={this.renderOptionLabel}
              maxHeight="200px"
              placeholder="Choose a color..."
            />
          </Col>
        </Form.Group>
      </Form>
    );
  }

  render() {
    const { showLabelModal } = this.props;
    const { showDetails } = this.state;

    return (
      <Modal
        centered
        show={showLabelModal}
        onHide={this.props.onHide}
      >
        <Modal.Header closeButton>
          <Modal.Title>My labels</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.renderLabels()}
        </Modal.Body>
        {showDetails
          && (
            <Modal.Footer>
              <ButtonToolbar className="gap-1 mt-2">
                <Button variant="light" onClick={this.handleBackButton}>Back</Button>
                <Button variant="primary" onClick={this.handleSaveLabel}>Save</Button>
              </ButtonToolbar>
            </Modal.Footer>
          )}
      </Modal>
    );
  }
}

UserLabelModal.propTypes = {
  showLabelModal: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired
};

// eslint-disable-next-line react/no-multi-comp
class EditUserLabels extends React.Component {
  constructor(props) {
    super(props);

    const userState = UserStore.getState();
    this.state = {
      currentUser: userState.currentUser || {},
      labelOptions: userState.labels || [],
    };
    this.onChange = this.onChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  handleSelectChange(val) {
    const { element, fnCb } = this.props;
    const ids = val.map((v) => v.id);
    element.setUserLabels(ids);
    fnCb(element);
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labelOptions: labels || [],
    });
  }

  render() {
    const { currentUser, labelOptions } = this.state;
    const { element } = this.props;

    const curLabelIds = element?.user_labels || [];
    const selectedLabels = labelOptions.filter((o) => (
      curLabelIds.includes(o.id) && (o.access_level > 0 || o.user_id === currentUser.id)
    ))

    const options = labelOptions
      .filter((o) => o.access_level === 2 || o.user_id === currentUser.id)

    return (
      <Form.Group>
        <Form.Label>My labels</Form.Label>
        <Select
          isMulti
          options={options}
          getOptionValue={(label) => label.id}
          getOptionLabel={(label) => label.title}
          formatOptionLabel={UserLabel}
          value={selectedLabels}
          onChange={this.handleSelectChange}
        />
      </Form.Group>
    );
  }
}

EditUserLabels.propTypes = {
  element: PropTypes.object.isRequired,
  fnCb: PropTypes.func.isRequired,
};


// eslint-disable-next-line react/no-multi-comp
class ShowUserLabels extends React.Component {
  constructor(props) {
    super(props);

    const { currentUser, labels } = UserStore.getState();
    this.state = {
      currentUser: currentUser || {},
      labelOptions: labels || [],
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labelOptions: labels || [],
    });
  }

  render() {
    const { element } = this.props;
    const { currentUser, labelOptions } = this.state;

    const curLabelIds = element?.tag?.taggable_data?.user_labels || [];
    const labels = labelOptions.filter((o) => (
      curLabelIds.includes(o.id) && (o.access_level > 0 || o.user_id === currentUser.id)
    ));

    return labels.map((l) => <UserLabel key={l.id} {...l} />);
  }
}

ShowUserLabels.propTypes = {
  element: PropTypes.object.isRequired
};


class SearchUserLabels extends React.Component {
  constructor(props) {
    super(props);

    const { currentUser, labels } = UserStore.getState();
    this.state = {
      currentUser: currentUser || {},
      labels: labels || [],
    };
    this.onChange = this.onChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  handleSelectChange(value) {
    this.props.fnCb(value?.id ?? null);
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labels
    });
  }

  render() {
    const { currentUser, labels } = this.state;
    const { userLabel } = this.props;
    const list = (labels || []).filter(
      (r) => r.access_level === 2 || r.user_id === (currentUser && currentUser.id)
    );

    return (
      <Select
        isClearable
        options={list}
        getOptionValue={(label) => label.id}
        getOptionLabel={(label) => label.title}
        formatOptionLabel={UserLabel}
        value={labels.find((l) => l.id === userLabel)}
        onChange={this.handleSelectChange}
        menuPortalTarget={document.body}
        placeholder="Filter by label"
        minWidth="100px"
      />
    );
  }
}

SearchUserLabels.propTypes = {
  fnCb: PropTypes.func.isRequired,
  userLabel: PropTypes.number,
};

SearchUserLabels.defaultProps = {
  userLabel: null,
};

export { UserLabelModal, EditUserLabels, ShowUserLabels, SearchUserLabels };
