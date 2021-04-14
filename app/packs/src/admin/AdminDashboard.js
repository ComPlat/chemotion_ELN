import React from 'react';
import { Panel, Button, FormControl, InputGroup } from 'react-bootstrap';
import AdminFetcher from '../components/fetchers/AdminFetcher';

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
        <Panel>
          <InputGroup>
            <InputGroup.Addon>Disk Available   (MB)</InputGroup.Addon>
            <FormControl
              type="text"
              defaultValue={diskAvailable || ''}
              readOnly
            />
            <InputGroup.Addon>Disk Percent Used (%)</InputGroup.Addon>
            <FormControl
              type="text"
              style={style}
              defaultValue={`${diskPercentUsed}%` || ''}
              readOnly
            />
          </InputGroup>
        </Panel>
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
