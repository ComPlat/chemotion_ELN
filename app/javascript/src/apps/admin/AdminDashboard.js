import React from 'react';
import {
  InputGroup, Card, Form, Button, Table, Badge
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
      storageTiers: [],
      storageProblems: [],
    };
    this.handleDiskspace = this.handleDiskspace.bind(this);
    this.handleSaveBtn = this.handleSaveBtn.bind(this);
  }

  componentDidMount() {
    this.handleDiskspace();
    this.getAllocatedUserSpace();
    this.getStorageTiers();
  }

  getStorageTiers() {
    AdminFetcher.fetchStorageTiers()
      .then((result) => {
        this.setState({
          storageTiers: result.tiers || [],
          storageProblems: result.problems || [],
        });
      });
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

  renderStorageTiers() {
    const { storageTiers, storageProblems } = this.state;
    if (storageTiers.length === 0) return null;

    return (
      <Card style={{ width: '30rem' }}>
        <Card.Header>Attachment storage</Card.Header>
        <Card.Body className="p-0">
          <Table size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Location</th>
                <th className="text-end">Files</th>
                <th className="text-end">MB</th>
              </tr>
            </thead>
            <tbody>
              {storageTiers.map((tier) => (
                <tr key={tier.tier}>
                  <td>
                    <Badge bg={tier.kind === 'hot' ? 'primary' : 'secondary'}>{tier.kind}</Badge>
                    {' '}
                    {tier.tier}
                  </td>
                  <td className="text-break"><small>{tier.path}</small></td>
                  <td className="text-end">{tier.files}</td>
                  <td className="text-end">{tier.mb}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {storageProblems.length > 0 && (
            <div className="text-danger p-2">
              {storageProblems.map((problem) => <div key={problem}>{problem}</div>)}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  }

  render() {
    const { showDiskInfo } = this.state;
    if (showDiskInfo) {
      return (
        <div className="d-flex gap-3 align-items-start flex-wrap">
          {this.renderDiskInfo()}
          {this.renderStorageTiers()}
        </div>
      );
    }
    return (<div />);
  }
}
