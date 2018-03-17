import React from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row, Col } from 'react-bootstrap';
import Immutable from 'immutable';

import Navigation from './Navigation';
import DisplayNoVNC from './DisplayNoVNC';
import DeviceActions from '../components/actions/UserActions';
import DeviceStore from '../components/stores/UserStore';

class CnC extends React.Component {
  constructor(props) {
    super();
    this.state = {
      devices: [],
      selected: {},
      showDeviceList: true,
    };
    this.UserStoreChange = this.UserStoreChange.bind(this);
    this.toggleDeviceList = this.toggleDeviceList.bind(this);
  }

  componentDidMount() {
    DeviceStore.listen(this.UserStoreChange);
    DeviceActions.fetchNoVNCDevices();
  }

  // shouldComponentUpdate() {
  //
  // }

  componentWillUnmount() {
    DeviceStore.unlisten(this.UserStoreChange);
  }

  UserStoreChange(UserStoreState) {
    this.setState(prevState => ({ ...prevState, devices: UserStoreState.devices }));
  }

  deviceClick(device) {
    this.setState(prevState => ({ ...prevState, selected: device }));
  }

  toggleDeviceList() {
    const { showDeviceList } = this.state;
    this.setState({
      showDeviceList: !showDeviceList,
      indicatorClassName: showDeviceList ? 'fa fa-chevron-circle-right' : 'fa fa-chevron-circle-left',
      mainContentClassName: showDeviceList ? 'small-col full-main' : 'small-col main-content'
    });
  }

  tree(dev, selectedId) {
    return (
      <Col className="small-col collec-tree">
        <div className="tree-view">
          <div className="title" style={{ backgroundColor: 'white' }}>
            <i className="fa fa-list" /> &nbsp;&nbsp; Devices
          </div>
        </div>
        <div className="tree-wrapper">
          {dev.map((device, index) => (
            <div
              className="tree-view"
              key={`device${device.id}`}
              onClick={() => this.deviceClick(device)}
              role="button"
              tabIndex={index === 0 ? 0 : -1}
            >
              <div className={`title ${selectedId === device.id ? 'selected' : null}`}>
                {device.name}
              </div>
            </div>
          ))}
        </div>
      </Col>
    );
  }

  render() {
    const { devices, selected, showDeviceList } = this.state;

    return (
      <div>
        <Grid fluid>
          <Row className="card-navigation">
            <Navigation toggleDeviceList={this.toggleDeviceList} />
          </Row>
          <Row className="card-content container-fluid" >
            {showDeviceList ? this.tree(devices, selected.id) : null}
            <Col className="small-col main-content" >
              <DisplayNoVNC device={selected} />
            </Col>
          </Row>
        </Grid>
      </div>
    );
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('CnC');
  if (domElement) { ReactDOM.render(<CnC />, domElement); }
});
