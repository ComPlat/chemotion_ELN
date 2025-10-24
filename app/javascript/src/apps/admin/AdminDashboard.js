import React from 'react';
import {
  InputGroup, Card, Form, Button
} from 'react-bootstrap';
import propType from 'prop-types';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { injectIntl, FormattedMessage } from 'react-intl';

class AdminDashboard extends React.Component {
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
    const { intl } = this.props;

    const className = diskPercentUsed > 80 ? 'text-danger' : '';

    const formattedDiskAvailable = intl.formatNumber(diskAvailable);
    const formattedDiskPercentUsed = intl.formatNumber(diskPercentUsed / 100, {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (
      <Card style={{ width: '30rem' }}>
        <Card.Body className="p-0">

          {/* Available disk space */}
          <InputGroup.Text>
            <FormattedMessage id="dashboard-disk_available" />
          </InputGroup.Text>
          <Form.Control
            type="text"
            readOnly
            value={formattedDiskAvailable || ''}
          />

          {/* Disk percent used */}
          <InputGroup.Text>
            <FormattedMessage id="dashboard-disk_percent_used" />
          </InputGroup.Text>
          <Form.Control
            type="text"
            className={className}
            readOnly
            value={formattedDiskPercentUsed || ''}
          />

          {/* Allocated space per user */}
          <InputGroup.Text>
            <FormattedMessage id="dashboard-default_user_allocated_space" />
          </InputGroup.Text>
          <InputGroup>
            <Form.Control
              type="number"
              min="0"
              defaultValue={allocatedUserSpace || ''}
              onChange={(event) => this.setState({ allocatedUserSpace: event.target.value })}
            />
            <InputGroup.Text>MB</InputGroup.Text>
            <Button variant="warning" onClick={this.handleSaveBtn}>
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
AdminDashboard.propTypes = {
  intl: propType.shape({
    formatMessage: propType.func.isRequired,
    formatNumber: propType.func.isRequired,
  }).isRequired
};

export default injectIntl(AdminDashboard);
