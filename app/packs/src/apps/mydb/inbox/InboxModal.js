import React from 'react';
import Draggable from 'react-draggable';
import {
  Badge, Button, Panel, Glyphicon, Pagination, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import DeviceBox from 'src/apps/mydb/inbox/DeviceBox';
import UnsortedBox from 'src/apps/mydb/inbox/UnsortedBox';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';

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
      sortColumn: 'name',
    };

    this.onChange = this.onChange.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.onClickInbox = this.onClickInbox.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  componentDidMount() {
    InboxStore.listen(this.onChange);
    UIStore.listen(this.onUIStoreChange);
    InboxActions.fetchInboxCount();
    this.initState();
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

  onUIStoreChange(state) {
    const { collectorAddress } = state;
    if (collectorAddress !== this.state.collectorAddress) {
      this.setState({ collectorAddress });
    }
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

  initState = () => {
    const type = 'inbox';
    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};

    // you are not able to use this.setState because this would rerender it again and again ...

    // eslint-disable-next-line react/no-direct-mutation-state
    this.state.sortColumn = filters[type]?.sort || 'name';
  };

  updateFilterAndUserProfile = (type, sort) => {
    InboxActions.changeInboxFilter({
      name: type,
      sort: sort,
    });

    UserActions.updateUserProfile({
      data: {
        filters: {
          [type]: {
            sort: sort,
          },
        },
      },
    });
  };

  changeSortColumn = () => {
    const type = 'inbox';
    const { sortColumn } = this.state;
    const sort = sortColumn === 'created_at' ? 'name' : 'created_at';

    this.setState({
      sortColumn: sort,
    }, () => {
      this.updateFilterAndUserProfile(type, sort);
    });
  };

  renderSortButton() {
    this.initState();

    const sortTitle = this.state.sortColumn === 'name'
        ? `click to sort datasets and attachments by creation date (descending) - currently sorted by name (ascending)`
        : `click to sort datasets and attachments by name (ascending) - currently sorted by creation date (descending)`;
    const sortTooltip = <Tooltip id="inbox_sort_tooltip">{sortTitle}</Tooltip>;
    const sortIconClass = this.state.sortColumn === 'name' ? 'fa-sort-alpha-asc' : 'fa-clock-o';
    const sortIcon = <i className={`fa ${sortIconClass}`} />;
    const sortContent = (
      <OverlayTrigger placement="bottom" overlay={sortTooltip}>
        <button
            type="button"
            className="btn-inbox-sort"
            onClick={this.changeSortColumn}
        >
          {sortIcon}
        </button>
      </OverlayTrigger>
    );

    return (
      <>
        {sortContent}
      </>
    );
  }

  refreshInbox() {
    const { currentPage, itemsPerPage } = this.state;
    LoadingActions.start();
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  }

  handleMouseDown = (e) => {
    e.preventDefault();

    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  handleMouseMove = (e) => {
    // Update the position of the div based on the mouse movement
    const div = document.getElementById('draggableInbox');
    div.style.left = `${e.clientX}px`;
    div.style.top = `${e.clientY}px`;
  };

  handleMouseUp = () => {
    // Remove the event listeners when the dragging is finished
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  lockedSubtrees() {
    const roots = this.state.lockedRoots;

    return this.subtrees(roots, null, false);
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

  infoMessage() {
    const { collectorAddress } = this.state;
    return (
      <Tooltip id="assignButton">
        You can send yourself files to your inbox by emailing them from your registered email to the following email address:
        { ' ' }
        {collectorAddress}
        { ' ' }
        . Click to copy the address to your clipboard.
      </Tooltip>
    );
  }

  collectorAddressInfoButton() {
    const { collectorAddress } = this.state;

    return (
      <CopyToClipboard text={collectorAddress}>
        <OverlayTrigger placement="bottom" overlay={this.infoMessage()}>
          <Button
            bsSize="xsmall"
            className="btn btn-circle btn-sm btn-info button-right"
          >
            <Glyphicon glyph="info-sign" />
          </Button>
        </OverlayTrigger>
      </CopyToClipboard>
    );
  }

  render() {
    const { showCollectionTree } = this.props;
    const {
      visible, inboxVisible, numberOfAttachments, collectorAddress
    } = this.state;

    const panelClass = showCollectionTree ? 'small-col col-md-4' : 'small-col col-md-5';
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
              <Panel.Heading
                className="cursor handle draggable"
                id="draggableInbox"
                onMouseDown={this.handleMouseDown}
              >
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
                {this.renderSortButton()}
                <Button
                  bsStyle="success"
                  bsSize="xsmall"
                  className="button-right"
                  onClick={() => this.refreshInbox()}
                >
                  <Glyphicon bsSize="small" glyph="refresh" />
                </Button>
                {collectorAddress ? this.collectorAddressInfoButton() : null}
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
