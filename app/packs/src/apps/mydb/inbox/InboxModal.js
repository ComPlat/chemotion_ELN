import React from 'react';
import Draggable from 'react-draggable';
import {
  Badge, Button, Panel, Glyphicon, Pagination
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import DeviceBox from 'src/apps/mydb/inbox/DeviceBox';
import UnsortedBox from 'src/apps/mydb/inbox/UnsortedBox';

export default class InboxModal extends React.Component {
  constructor(props) {
    super(props);

    const inboxState = InboxStore.getState();

    this.state = {
      inbox: inboxState.inbox,
      inboxVisible: inboxState.inboxVisible,
      numberOfAttachments: inboxState.numberOfAttachments,
      visible: inboxState.inboxModalVisible,

      currentPage: inboxState.currentPage,
      itemsPerPage: inboxState.itemsPerPage,
      totalPages: inboxState.totalPages,
      activeDeviceBoxId: inboxState.activeDeviceBoxId,
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

  componentDidUpdate(prevProps, prevState) {
    const { currentPage, itemsPerPage } = this.state;
    if (prevState.currentPage !== currentPage
        || prevState.itemsPerPage !== itemsPerPage) {
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    }
  }

  onChange(state) {
    this.setState(state);
    this.setState({ visible: state.inboxModalVisible });
  }

  onClickInbox() {
    const {
      inboxVisible, inbox, currentPage, itemsPerPage
    } = this.state;
    InboxActions.setInboxVisible({ inboxVisible: !inboxVisible });
    if (!inbox.children) {
      LoadingActions.start();
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    }
  }

  handlePageChange(pageNumber) {
    const { totalPages } = this.state;
    if (pageNumber > 0 && pageNumber <= totalPages) {
      this.setState({
        currentPage: pageNumber
      }, () => InboxActions.setInboxPagination({ currentPage: this.state.currentPage }));
    }
  }

  refreshInbox() {
    const { currentPage, itemsPerPage } = this.state;
    LoadingActions.start();
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  }

  renderPagination = () => {
    const { currentPage, totalPages } = this.state;

    if (totalPages <= 1) {
      return;
    }

    const pageNumbers = [];
    const minPage = Math.max(currentPage - 4, 1);
    const maxPage = Math.min(minPage + 4, totalPages);

    for (let i = minPage; i <= maxPage; i += 1) {
      pageNumbers.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => this.handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (totalPages > maxPage) {
      pageNumbers.push(<Pagination.Ellipsis key="Ell" />);
    }

    return (
      <div className="list-pagination">
        <Pagination>
          <Pagination.First disabled={currentPage === 1} key="First" onClick={() => this.handlePageChange(1)} />
          <Pagination.Prev disabled={currentPage === 1} key="Prev" onClick={() => this.handlePageChange(currentPage - 1)} />
          {pageNumbers}
          <Pagination.Next disabled={currentPage === totalPages} key="Next" onClick={() => this.handlePageChange(currentPage + 1)} />
          <Pagination.Last disabled={currentPage === totalPages} key="Last" onClick={() => this.handlePageChange(totalPages)} />
        </Pagination>
      </div>
    );
  };

  inboxSubtrees() {
    const { inbox, activeDeviceBoxId } = this.state;

    let boxes = '';
    if (inbox.children) {
      inbox.children.sort((a, b) => {
        if (a.name > b.name) { return 1; } if (a.name < b.name) { return -1; } return 0;
      });
      boxes = inbox.children.map(deviceBox => (
        <DeviceBox
          key={`box_${deviceBox.id}`}
          device_box={deviceBox}
          largerInbox
          deviceBoxVisible={deviceBox.id === activeDeviceBoxId}
        />
      ));
    }

    return (
      <div className="tree-view">
        {boxes}
        {this.renderPagination()}
        {inbox.unlinked_attachments ? (
          <UnsortedBox
            key="unsorted_box"
            unsorted_box={inbox.unlinked_attachments}
            unsortedVisible={activeDeviceBoxId === -1}
            largerInbox
          />
        ) : ''}
      </div>
    );
  }

  render() {
    const { showCollectionTree } = this.props;
    const { visible, inboxVisible, numberOfAttachments } = this.state;

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
                  numberOfAttachments > 0 ? (
                    <Badge>
                      {' '}
                      {numberOfAttachments}
                      {' '}
                    </Badge>
                  ) : ''
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
