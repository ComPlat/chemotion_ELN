import React from 'react';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import ConfirmDeleteButton from 'src/components/common/ConfirmDeleteButton';

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
    const { rootType, actionType, groupRec, userRec, isRoot } = this.props;
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

    return (
      <div className="actions d-inline-block">
        <ConfirmDeleteButton
          id={`confirm-delete-${rootType}-${groupRec.id}${userRec ? `-${userRec.id}` : ''}`}
          header={msg}
          onConfirm={() => this.confirmDelete(rootType, actionType, groupRec, userRec, isRoot)}
        />
      </div>
    );
  }
}
