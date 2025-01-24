import React from 'react';
import {
  InputGroup, Card, Form, Button
} from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';

export default class AdminDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      diskAvailable: 0,
      diskPercentUsed: 0,
      availableUserSpace: 0,
      showDiskInfo: false,
    };
    this.handleDiskspace = this.handleDiskspace.bind(this);
    this.handleSaveBtn = this.handleSaveBtn.bind(this);
  }

  componentDidMount() {
    this.handleDiskspace();
    this.getAvailableUserSpace();
  }

  handleDiskspace() {
    AdminFetcher.checkDiskSpace()
      .then((result) => {
        this.setState({
          diskAvailable: result.mb_available,
          diskPercentUsed: result.percent_used,
          showDiskInfo: true
        });
      });
  }

  handleSaveBtn() {
    const { availableUserSpace } = this.state;
    AdminFetcher.setAvailableUserSpace(availableUserSpace * 1024 * 1024);
  }

  getAvailableUserSpace() {
    AdminFetcher.getAvailableUserSpace()
      .then((result) => {
        this.setState({
          availableUserSpace: result.available_user_space,
        });
      });
  }

  renderDiskInfo() {
    const {
      diskAvailable, diskPercentUsed, availableUserSpace
    } = this.state;
    const className = diskPercentUsed > 80 ? 'text-danger' : '';

    return (
      <Card style={{ width: '30rem' }}>
        <Card.Body className="p-0">
          <InputGroup.Text>Disk Available (MB)</InputGroup.Text>
          <Form.Control
            type="text"
            defaultValue={diskAvailable || ''}
            readOnly
          />
          <InputGroup.Text>Disk Percent Used (%)</InputGroup.Text>
          <Form.Control
            type="text"
            className={className}
            defaultValue={`${diskPercentUsed}%` || ''}
            readOnly
          />
          <InputGroup.Text>Default User Available Space (MB)</InputGroup.Text>
          <InputGroup>
            <Form.Control
              type="number"
              min="0"
              defaultValue={availableUserSpace || ''}
              onChange={(event) => this.setState({ availableUserSpace: event.target.value })}
            />
            <Button
              variant="warning"
              onClick={() => this.handleSaveBtn()}
            >
              Save
            </Button>
          </InputGroup>
        </Card.Body>
      </Card>
    );
  }

  render() {
    const { showDiskInfo } = this.state;
    if (showDiskInfo) {
      return this.renderDiskInfo();
    }
    return (<div />);
  }
}
