import React from 'react';
import { FormControl, InputGroup, Card } from 'react-bootstrap';
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
    let style = {};
    if (diskPercentUsed > 80) {
      style = {
        color: 'red',
      };
    } else {
      style = {
        color: 'black',
      };
    }

    return (
      <div>
        <Card>
          <Card.Body className='p-0'>
            <InputGroup >
              <InputGroup.Text >Disk Available (MB)</InputGroup.Text>
              <FormControl
                type="text"
                defaultValue={diskAvailable || ''}
                readOnly
              />
              <InputGroup.Text >Disk Percent Used (%)</InputGroup.Text>
              <FormControl
                type="text"
                style={style}
                defaultValue={`${diskPercentUsed}%` || ''}
                readOnly
              />
            </InputGroup>
          </Card.Body>
        </Card>
      </div>
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
