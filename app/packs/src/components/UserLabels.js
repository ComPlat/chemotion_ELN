/* eslint-disable react/destructuring-assignment */
/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Table,
  Col,
  Badge,
  Panel,
  ButtonGroup,
  Button,
  Form,
  FormGroup,
  FormControl,
  ControlLabel,
  InputGroup,
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
    if (labels == null || labels.length === 0) {
      return <div />;
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
          <td md={3}><Badge style={badgeStyle}>{g.title}</Badge></td>
          <td md={3}>{accessLabel}</td>
          <td md={3}>{g.description}</td>
          <td md={3}>{g.color}</td>
          <td md={3}>
            <Button
              bsSize="xs"
              disabled={g.access_level === 2}
              bsStyle={g.access_level === 2 ? 'default' : 'success'}
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
        <Panel bsStyle="success">
          <Panel.Heading>
            <div>
              <ButtonGroup>
                <Button bsStyle="primary" onClick={() => this.handelNewLabel()}>
                  Create&nbsp;
                  <i className="fa fa-plus" />
                </Button>
              </ButtonGroup>
            </div>
          </Panel.Heading>
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
        </Panel>
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
        <FormGroup controlId="accessLevelInput">
          <Col componentClass={ControlLabel} sm={2}>
            Public?
          </Col>
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
        </FormGroup>
        <FormGroup controlId="titleInput">
          <Col componentClass={ControlLabel} sm={2}>
            Title
          </Col>
          <Col sm={10}>
            <FormControl
              type="text"
              inputRef={(m) => { this.titleInput = m; }}
              defaultValue={label.title || ''}
            />
          </Col>
        </FormGroup>

        <FormGroup controlId="descInput">
          <Col componentClass={ControlLabel} sm={2}>
            Description
          </Col>
          <Col sm={10}>
            <FormControl
              type="text"
              inputRef={(m) => { this.descInput = m; }}
              defaultValue={label.description || ''}
            />
          </Col>
        </FormGroup>

        <FormGroup controlId="colorInput">
          <Col componentClass={ControlLabel} sm={2}>
            Background Color
          </Col>
          <Col sm={10}>
            <InputGroup>
              <InputGroup.Addon style={bcStyle} />
              <FormControl
                type="text"
                readOnly
                inputRef={(m) => { this.colorInput = m; }}
                value={label.color || this.state.defaultColor}
              />
            </InputGroup>
          </Col>
        </FormGroup>
        <FormGroup controlId="formHorizontalPicker">
          <Col sm={12}>
            <CirclePicker width="90%" onChangeComplete={this.handleColorPicker} />
          </Col>
        </FormGroup>

        <ButtonGroup>
          <Button onClick={this.handleBackButton}>Back</Button>
          <Button onClick={this.handleSaveLabel}>Save</Button>
        </ButtonGroup>
      </Form>
    );
  }

  render() {
    const { showLabelModal } = this.props;
    return (
      <Modal
        show={showLabelModal}
        onHide={this.props.onHide}
      >
        <Modal.Header closeButton>
          <Modal.Title>My Labels</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.renderLabels()}
        </Modal.Body>
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
      .map((ll) => ({
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
      }));

    if (selectedLabels == null) {
      selectedLabels = defaultLabels;
    }

    const labelOptions =
      (this.state.labels || [])
        .filter(r => r.access_level === 2 || r.user_id === currentUser.id)
        .map(ll => ({
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
        <FormGroup>
          <ControlLabel>My Labels</ControlLabel>
          <Select
            className="status-select"
            name="sampleUserLabels"
            clearable={false}
            multi
            options={labelOptions}
            value={selectedLabels}
            onChange={(e) => this.handleSelectChange(e)}
          />
        </FormGroup>
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

    const elementLabels = (showLabels || []).map((ll) => (
      <Badge
        key={`bg_${ll.id}`}
        style={{
          backgroundColor: ll.color,
          color: 'white',
          borderColor: 'white',
          borderStyle: 'solid',
          borderWidth: 'thin',
          borderRadius: ll.access_level === 2 ? '0.25em' : '10px',
        }}
      >
        {ll.title}
      </Badge>
    ));

    return (
      <span>
        &nbsp;
        {elementLabels}
        &nbsp;
      </span>
    );
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
