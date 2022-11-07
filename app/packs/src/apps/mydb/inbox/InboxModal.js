import React from 'react';
import Draggable from 'react-draggable';
import { Badge, Button, Panel, Glyphicon } from 'react-bootstrap';
import PropTypes from 'prop-types';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import DeviceBox from 'src/apps/mydb/inbox/DeviceBox';
import UnsortedBox from 'src/apps/mydb/inbox/UnsortedBox';

import Xdiv from 'src/components/extra/CollectionTreeXdiv';

export default class InboxModal extends React.Component {
  constructor(props) {
    super(props);

    const inboxState = InboxStore.getState();

    this.state = {
      inbox: inboxState.inbox,
      inboxVisible: false,
      numberOfAttachments: inboxState.numberOfAttachments,
      visible: inboxState.inboxModalVisible
    };

    this.onChange = this.onChange.bind(this);
    this.onClickInbox = this.onClickInbox.bind(this);
  }

  componentDidMount() {
    InboxStore.listen(this.onChange);
    InboxActions.fetchInboxCount();
  }

  componentWillUnmount() {
    InboxStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(state);
    this.setState({ visible: state.inboxModalVisible });
  }

  onClickInbox() {
    const { inboxVisible, inbox } = this.state;
    this.setState({ inboxVisible: !inboxVisible });
    if (!inbox.children) {
      LoadingActions.start();
      InboxActions.fetchInbox();
    }
  }

  refreshInbox() {
    LoadingActions.start();
    InboxActions.fetchInbox();
  }

  lockedSubtrees() {
    const roots = this.state.lockedRoots;

    return this.subtrees(roots, null, false);
  }

  inboxSubtrees() {
    const { inbox } = this.state;

    let boxes = '';
    if (inbox.children) {
      inbox.children.sort((a, b) => {
        if (a.name > b.name) { return 1; } if (a.name < b.name) { return -1; } return 0;
      });
      boxes = inbox.children.map(deviceBox => (
        <DeviceBox key={`box_${deviceBox.id}`} device_box={deviceBox} largerInbox />
      ));
    }

    return (
      <div className="tree-view">
        {boxes}
        {inbox.unlinked_attachments
          ? <UnsortedBox key="unsorted_box" unsorted_box={inbox.unlinked_attachments} largerInbox />
          : ''
        }
      </div>
    );
  }

  render() {
    const { showCollectionTree } = this.props;
    const { visible, inboxVisible } = this.state;

    const extraDiv = [];
    for (let j = 0; j < Xdiv.count; j += 1) {
      const NoName = Xdiv[`Xdiv${j}`];
      extraDiv.push(<NoName key={`Xdiv${j}`} />);
    }

    const panelClass = showCollectionTree ? 'small-col col-md-6' : 'small-col col-md-5';
    const inboxDisplay = inboxVisible ? '' : 'none';

    if (visible) {
      return (
        <Draggable
          handle=".handle"
          bounds="body"
        >
          <div
            className={panelClass}
            style={{ zIndex: 10, position: 'absolute', top: '70px', left: '10px' }}
          >
            <Panel bsStyle="primary" className="eln-panel-detail research-plan-details cursor">
              <Panel.Heading className="cursor handle">
                <button
                  type="button"
                  className="btn-inbox"
                  onClick={() => this.onClickInbox()}
                >
                  <i className="fa fa-inbox" />
                  <span style={{ marginLeft: '10px', marginRight: '5px' }}>Inbox</span>
                </button>
                {
                  this.state.numberOfAttachments > 0 ? <Badge> {this.state.numberOfAttachments} </Badge> : ''
                }
                <Button
                  bsStyle="danger"
                  bsSize="xsmall"
                  className="button-right"
                  onClick={InboxActions.toggleInboxModal}
                >
                  <i className="fa fa-times" />
                </Button>
                <Button
                  bsStyle="success"
                  bsSize="xsmall"
                  className="button-right"
                  onClick={() => this.refreshInbox()}
                >
                  <Glyphicon bsSize="small" glyph="refresh" />
                </Button>
              </Panel.Heading>
              <Panel.Body>
                <div>
                  <div className="tree-view">
                    <div className="title" style={{ backgroundColor: 'white', display: inboxVisible ? 'none' : '' }}>
                      <button
                        type="button"
                        className="btn-inbox"
                        onClick={() => this.onClickInbox()}
                      >
                        <i className="fa fa-inbox" />
                        <span style={{ marginLeft: '10px' }}>Fetch Inbox</span>
                      </button>
                    </div>

                  </div>
                  <div className="tree-wrapper" style={{ display: inboxDisplay }}>
                    {this.inboxSubtrees()}
                  </div>
                </div>
              </Panel.Body>
            </Panel>
          </div>
        </Draggable>

      );
    }
    return null;
  }
}

InboxModal.propTypes = {
  showCollectionTree: PropTypes.bool.isRequired
};
