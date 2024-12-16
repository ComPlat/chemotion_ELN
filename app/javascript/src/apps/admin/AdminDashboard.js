import React from 'react';
import { InputGroup, Card, Form } from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';

export default class AdminDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      diskAvailable: 0,
      diskPercentUsed: 0,
      usersAvailable: 0,
      showDiskInfo: false,
    };
    this.handleDiskspace = this.handleDiskspace.bind(this);
    this.getUsersAvailable = this.getUsersAvailable.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    this.handleDiskspace();
    this.getUsersAvailable();
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

  // eslint-disable-next-line class-methods-use-this
  handleChange(event) {
    AdminFetcher.setUsersAvailable(event.target.value);
  }

  getUsersAvailable() {
    AdminFetcher.getUsersAvailable()
      .then((result) => {
        this.setState({
          usersAvailable: result.users_available,
        });
      });
  }

  renderDiskInfo() {
    const { diskAvailable, diskPercentUsed, usersAvailable } = this.state;
    const className = diskPercentUsed > 80 ? 'text-danger' : '';

    return (
      <Card>
        <Card.Body className="p-0">
          <InputGroup>
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
            <InputGroup.Text>Default User Available (B)</InputGroup.Text>
            <Form.Control
              type="number"
              min="0"
              defaultValue={usersAvailable || ''}
              onChange={this.handleChange}
            />
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
