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
      allocatedUserSpace: 0,
      showDiskInfo: false,
    };
    this.handleDiskspace = this.handleDiskspace.bind(this);
    this.handleSaveBtn = this.handleSaveBtn.bind(this);
  }

  componentDidMount() {
    this.handleDiskspace();
    this.getAllocatedUserSpace();
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
    const { allocatedUserSpace } = this.state;
    AdminFetcher.setAllocatedUserSpace(Math.round(allocatedUserSpace) * 1024 * 1024);
  }

  getAllocatedUserSpace() {
    AdminFetcher.getAllocatedUserSpace()
      .then((result) => {
        this.setState({
          allocatedUserSpace: result.allocated_user_space,
        });
      });
  }

  renderDiskInfo() {
    const {
      diskAvailable, diskPercentUsed, allocatedUserSpace
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
          <InputGroup.Text>Default User Allocated Space (MB)</InputGroup.Text>
          <InputGroup>
            <Form.Control
              type="number"
              min="0"
              defaultValue={allocatedUserSpace || ''}
              onChange={(event) => this.setState({ allocatedUserSpace: event.target.value })}
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
