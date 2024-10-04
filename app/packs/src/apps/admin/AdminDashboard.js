import React from 'react';
import { InputGroup, Card, Form } from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';

export default class AdminDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      diskAvailable: 0,
      diskPercentUsed: 0,
      showDiskInfo: false,
    };
    this.handleDiskspace = this.handleDiskspace.bind(this);
  }

  componentDidMount() {
    this.handleDiskspace();
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

  renderDiskInfo() {
    const { diskAvailable, diskPercentUsed } = this.state;
    let className = diskPercentUsed > 80 ? 'text-danger' : '';

    return (
        <Card>
          <Card.Body className='p-0'>
            <InputGroup >
              <InputGroup.Text >Disk Available (MB)</InputGroup.Text>
              <Form.Control
                type="text"
                defaultValue={diskAvailable || ''}
                readOnly
              />
              <InputGroup.Text >Disk Percent Used (%)</InputGroup.Text>
              <Form.Control
                type="text"
                className={className}
                defaultValue={`${diskPercentUsed}%` || ''}
                readOnly
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
