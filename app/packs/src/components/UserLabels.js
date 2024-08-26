/* eslint-disable react/destructuring-assignment */
/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Table, Badge, Button, Form, InputGroup, ButtonToolbar
} from 'react-bootstrap';
import { CirclePicker } from 'react-color';
import Select from 'react-select';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UserStore from 'src/stores/alt/stores/UserStore';

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
    this.handleAcessChange = this.handleAcessChange.bind(this);
    this.handleColorPicker = this.handleColorPicker.bind(this);
    this.handleEditLabelClick = this.handleEditLabelClick.bind(this);
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

  handleColorPicker(color, event) {
    const { label } = this.state;
    label.color = color.hex;
    this.setState({
      label
    });
  }

  handleAcessChange(val, e) {
    const { label } = this.state;
    label.access_level = (val === true || val === 1) ? 1 : 0;
    this.setState({
      label
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
    if (typeof (this.colorInput) !== 'undefined' && this.colorInput) {
      label.color = this.colorInput.value;
    }

    if (label.title != null && label.title.trim().length !== 0) {
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
        message: 'Title is empty',
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
    ) || [];

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

  renderUserLabels() {
    const { labels } = this.state;
    if (labels === null || labels.length === 0) {
      return null;
    }

    return (labels || []).map(g => {
      const badgeStyle = {
        backgroundColor: g.color || this.state.defaultColor,
      };
      let accessLabel = '';
      switch (g.access_level) {
        case 0:
          accessLabel = 'Private';
          break;
        case 1:
          accessLabel = 'Public';
          break;
        default:
          accessLabel = '';
      }
      return (
        <tr key={`row_${g.id}`}>
          <td sm={3}><Badge bg="custom" style={badgeStyle}>{g.title}</Badge></td>
          <td sm={3}>{accessLabel}</td>
          <td sm={3}>{g.description}</td>
          <td sm={3}>{g.color}</td>
          <td sm={3}>
            <Button
              size="sm"
              disabled={g.access_level === 2}
              variant={g.access_level === 2 ? 'light' : 'success'}
              onClick={(e) => this.handleEditLabelClick(e, g)}
            >
              {g.access_level === 2 ? 'Global' : 'Edit'}
            </Button>
          </td>
        </tr>
      );
    });
  }

  renderLabels() {
    const { showDetails } = this.state;
    if (showDetails === true) {
      return this.renderLabel();
    }
    return (
      <div>
        <h3 className="p-3 bg-gray-300">
          <Button variant="primary" size="md" onClick={() => this.handelNewLabel()}>
            Create
            <i className="fa fa-plus ms-1" />
          </Button>
        </h3>
        <Table striped bordered condensed hover>
          <thead>
            <tr>
              <th>Label</th>
              <th>Access</th>
              <th>Description</th>
              <th>Color</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {this.renderUserLabels()}
          </tbody>
        </Table>
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
          <Col sm={10}>
            <Select
              style={{ zIndex: 2000 }}
              name="userLabel"
              clearable={false}
              options={accessList}
              onChange={e => this.handleAcessChange(!label.access_level, e)}
              value={label.access_level}
            />
          </Col>
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

        <Form.Group controlId="colorInput" className="mb-2">
          <Form.Label>
            Background Color
          </Form.Label>
          <InputGroup className="mb-3">
            <InputGroup.Text style={bcStyle} />
            <Form.Control
              type="text"
              readOnly
              ref={(m) => { this.colorInput = m; }}
              value={label.color || this.state.defaultColor}
            />
          </InputGroup>
        </Form.Group>
        <Form.Group controlId="formHorizontalPicker" className="m-2">
          <CirclePicker width="90%" onChangeComplete={this.handleColorPicker} />
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
          <Modal.Title>My Labels</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.renderLabels()}
        </Modal.Body>
        {showDetails
          && (
          <Modal.Footer className="border-0">
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

// eslint-disable-next-line react/no-multi-comp
class EditUserLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: (UserStore.getState() && UserStore.getState().currentUser) || {},
      labels: this.props.labels || (UserStore.getState() && UserStore.getState().labels) || [],
      selectedLabels: null
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
    if (val) {
      const ids = val.map((v) => v.value);
      if (ids != null) {
        element.setUserLabels(ids);
        fnCb(element);
      }
      this.setState({ selectedLabels: val });
    }
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labels
    });
  }

  render() {
    let { selectedLabels } = this.state;
    const { currentUser, labels } = this.state;

    const { element } = this.props;
    const curLableIds = element.tag && element.tag.taggable_data
          ? element.tag.taggable_data.user_labels
          : [];

    const defaultLabels = (labels || [])
      .filter(
        (r) => (curLableIds || []).includes(r.id)
          && (r.access_level > 0 || r.user_id === currentUser.id)
      )
      .map((label) => ({
        value: label.id,
        label: (
          <Badge
            bg="custom"
            style={{
              backgroundColor: label.color,
              borderRadius:
                label.access_level === 2
                  ? 'unset'
                  : '10px',
            }}
          >
            {label.title}
          </Badge>
        ),
      }));

    if (selectedLabels == null) {
      selectedLabels = defaultLabels;
    }

    const labelOptions = (this.state.labels || [])
      .filter((r) => r.access_level === 2 || r.user_id === currentUser.id)
      .map((label) => ({
        value: label.id,
        label: (
          <Badge
            bg="custom"
            style={{ backgroundColor: label.color }}
          >
            {label.title}
          </Badge>
        ),
      })) || [];

    return (
      <div>
        <Form.Group>
          <Form.Label>My Labels</Form.Label>
          <Select
            className="status-select"
            name="sampleUserLabels"
            clearable={false}
            multi
            options={labelOptions}
            value={selectedLabels}
            onChange={(e) => this.handleSelectChange(e)}
          />
        </Form.Group>
      </div>
    );
  }
}

// eslint-disable-next-line react/no-multi-comp
class ShowUserLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: (UserStore.getState() && UserStore.getState().currentUser) || {},
      labels: (UserStore.getState() && UserStore.getState().labels) || []
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
      labels
    });
  }

  render() {
    const { element } = this.props;
    const { currentUser, labels } = this.state;
    let showLabels = null;

    if (element.labels != null) {
      showLabels = element.labels;
    } else {
      const curLableIds =
        element.tag && element.tag.taggable_data
          ? element.tag.taggable_data.user_labels
          : [];

      showLabels = (labels || []).filter(
        r =>
          (curLableIds || []).includes(r.id) &&
          (r.access_level > 0 || r.user_id === currentUser.id)
      );
    }

    return (showLabels || []).map((ll) => (
      <Badge
        key={`bg_${ll.id}`}
        bg="custom"
        style={{
          backgroundColor: ll.color,
          borderRadius: ll.access_level === 2 ? '0.25em' : '10px',
        }}
      >
        {ll.title}
      </Badge>
    ));
  }
}

class SearchUserLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser:
        (UserStore.getState() && UserStore.getState().currentUser) || {},
      labels: (UserStore.getState() && UserStore.getState().labels) || [],
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
    this.props.fnCb(val || null);
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
    const { className, userLabel } = this.props;

    let labelList = [];
    labelList = (labels || []);

    const labelOptions =
      labelList.map(ll => ({
        value: ll.id,
        label: (
          <Badge
            style={{
              backgroundColor: ll.color,
              borderRadius: ll.access_level === 2 ? '0.25em' : '10px',
            }}
          >
            {ll.title}
          </Badge>
        ),
      })) || [];

    return (
      <div>
        <Select
          simpleValue
          clearable
          style={{ minWidth: 120 }}
          className={className}
          name="sampleUserLabels"
          multi={false}
          options={labelOptions}
          value={userLabel}
          onChange={(e) => this.handleSelectChange(e)}
        />
      </div>
    );
  }
}

UserLabelModal.propTypes = {
  showLabelModal: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired
};

EditUserLabels.propTypes = {
  element: PropTypes.object.isRequired,
  fnCb: PropTypes.func.isRequired,
};

ShowUserLabels.propTypes = {
  element: PropTypes.object.isRequired
};

SearchUserLabels.propTypes = {
  fnCb: PropTypes.func.isRequired,
  // eslint-disable-next-line react/require-default-props
  userLabel: PropTypes.number,
  className: PropTypes.string,
};

SearchUserLabels.defaultProps = {
  className: 'header-group-select',
};

export { UserLabelModal, EditUserLabels, ShowUserLabels, SearchUserLabels };
