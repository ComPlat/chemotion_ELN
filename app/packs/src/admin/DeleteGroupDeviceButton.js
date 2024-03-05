import React from 'react';
import { Button, ButtonGroup, Popover, OverlayTrigger } from 'react-bootstrap';
import AdminFetcher from '../components/fetchers/AdminFetcher';

export default class DeleteGroupDeviceButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groups: props.currentState.groups,
      devices: props.currentState.devices
    };

    this.onChangeGroupData = this.onChangeGroupData.bind(this);
    this.onChangeDeviceData = this.onChangeDeviceData.bind(this);
  }

  componentDidMount() {
  }

  onChangeGroupData = (groups) => {
    this.props.onChangeGroupData(groups);
  }

  onChangeDeviceData = (devices) => {
    this.props.onChangeDeviceData(devices);
  }

  confirmDelete(rootType, actionType, groupRec, userRec, isRoot = false) {
    const { groups, devices } = this.state;
    const rmUsers = userRec == null ? [] : [userRec.id];

    const params = {
      action: isRoot ? 'RootDel' : 'NodeDel',
      rootType,
      actionType,
      id: groupRec.id,
      destroy_obj: isRoot,
      rm_users: rmUsers
    };

    AdminFetcher.updateGroup(params)
      .then((result) => {
        switch (rootType) {
          case 'Group':
            this.onChangeGroupData();
            break;
          case 'Device':
            this.onChangeDeviceData();
            break;
          default:
            break;
        }
      });
  }

  render() {
    const {rootType, actionType, groupRec, userRec, isRoot} = this.props;
    let msg = 'remove yourself from the group';
    if (rootType === 'Group' && isRoot) {
      msg = `remove group: ${groupRec.name}`;
    } else if (rootType === 'Device' && isRoot) {
      msg = `remove device: ${groupRec.name}`;
    } else if (rootType === 'Group' && !isRoot && actionType === 'Person') {
      msg = `remove user: ${userRec.name} from group: ${groupRec.name} ?`;
    } else if (rootType === 'Group' && !isRoot && actionType === 'Device') {
      msg = `remove device: ${userRec.name} from group: ${groupRec.name} ?`;
    } else if (rootType === 'Device' && !isRoot) {
      msg = `remove user: ${userRec.name} from group: ${groupRec.name} ?`;
    } else {
      msg = `remove ???: ${groupRec.name}`;
    }

    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        {msg} <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.confirmDelete(rootType, actionType, groupRec, userRec, isRoot)}>
            Yes
          </Button><span>&nbsp;&nbsp;</span>
          <Button bsSize="xsmall" bsStyle="warning" onClick={this.handleClick} >
            No
          </Button>
        </div>
      </Popover>
    );

    return (
      <ButtonGroup className="actions">
        <OverlayTrigger
          animation
          placement="right"
          root
          trigger="focus"
          overlay={popover}
        >
          <Button bsSize="xsmall" bsStyle="danger" >
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }
}
