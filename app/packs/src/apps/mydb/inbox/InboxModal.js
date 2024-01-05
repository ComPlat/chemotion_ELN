/* eslint-disable react/destructuring-assignment */
import React from 'react';
import Draggable from 'react-draggable';
import {
  Badge, Button, Panel, Pagination, OverlayTrigger, Tooltip, DropdownButton, MenuItem
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
      colMdValue: 4,
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

  componentDidUpdate(prevProps, prevState) {
    const { currentPage, itemsPerPage } = this.state;
    if (prevState.currentPage !== currentPage
        || prevState.itemsPerPage !== itemsPerPage) {
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    }
  }

  componentWillUnmount() {
    InboxStore.unlisten(this.onChange);
  }

  handlePageChange(pageNumber) {
    const { totalPages } = this.state;
    if (pageNumber > 0 && pageNumber <= totalPages) {
      this.setState({
        currentPage: pageNumber
      }, () => InboxActions.setInboxPagination({ currentPage: this.state.currentPage }));
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

  handleSizingIconClick = (size) => {
    let newColMdValue;
    switch (size) {
      case 'Small':
        newColMdValue = 2;
        break;
      case 'Medium':
        newColMdValue = 4;
        break;
      case 'Large':
        newColMdValue = 5;
        break;
      default:
        newColMdValue = 4;
    }
    this.setState({ colMdValue: newColMdValue });

    InboxActions.changeInboxSize(size);
  };

  getSizeLabel = () => {
    const { colMdValue } = this.state;
    switch (colMdValue) {
      case 2:
        return 'Small';
      case 4:
        return 'Medium';
      case 5:
        return 'Large';
      default:
        return 'Unknown';
    }
  };

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
      sort,
    });

    UserActions.updateUserProfile({
      data: {
        filters: {
          [type]: {
            sort,
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

  refreshInbox() {
    const { currentPage, itemsPerPage } = this.state;
    LoadingActions.start();
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  }

  renderPagination = () => {
    const { currentPage, totalPages } = this.state;

    if (totalPages <= 1) {
      return null;
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
          <Pagination.Prev
            disabled={currentPage === 1}
            key="Prev"
            onClick={() => this.handlePageChange(currentPage - 1)}
          />
          {pageNumbers}
          <Pagination.Next
            disabled={currentPage === totalPages}
            key="Next"
            onClick={() => this.handlePageChange(currentPage + 1)}
          />
          <Pagination.Last
            disabled={currentPage === totalPages}
            key="Last"
            onClick={() => this.handlePageChange(totalPages)}
          />
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
      boxes = inbox.children.map((deviceBox) => (
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
        You can send yourself files to your inbox by emailing them
        <br />
        from your registered email to the following email address:&nbsp;
        {collectorAddress}
        .
        <br />
        Click to copy the address to your clipboard.
      </Tooltip>
    );
  }

  renderSizingIcon = () => {
    const tooltipText = `Change inbox size (Currently: ${this.getSizeLabel()})`;
    const sizes = ['Small', 'Medium', 'Large'];

    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="inbox_size_tooltip">{tooltipText}</Tooltip>}>
        <DropdownButton
          title="Size"
          className="header-button"
          id="dropdown-size-button"
          bsStyle="info"
          bsSize="xs"
          style={{ marginLeft: '10px' }}

        >
          {sizes.map((size) => (
            <MenuItem key={size} eventKey={size} onSelect={this.handleSizingIconClick}>
              {size}
            </MenuItem>
          ))}
        </DropdownButton>
      </OverlayTrigger>
    );
  };

  collectorAddressInfoButton() {
    const { collectorAddress } = this.state;

    return (
      <CopyToClipboard text={collectorAddress}>
        <OverlayTrigger placement="bottom" overlay={this.infoMessage()}>
          <Button
            bsSize="xsmall"
            className="header-button"
          >
            <i className="fa fa-info" />
          </Button>
        </OverlayTrigger>
      </CopyToClipboard>
    );
  }

  renderSortButton() {
    this.initState();

    const sortTitle = this.state.sortColumn === 'name'
      ? 'click to sort datasets and attachments by creation date (descending) - currently sorted alphabetically'
      : 'click to sort datasets and attachments alphabetically - currently sorted by creation date (descending)';
    const sortTooltip = <Tooltip id="inbox_sort_tooltip">{sortTitle}</Tooltip>;
    const sortIconClass = this.state.sortColumn === 'name' ? 'fa-sort-alpha-asc' : 'fa-clock-o';
    const sortIcon = <i className={`fa ${sortIconClass}`} />;
    return (
      <OverlayTrigger placement="bottom" overlay={sortTooltip}>
        <Button
          bsStyle="success"
          bsSize="xs"
          className="header-button"
          onClick={this.changeSortColumn}
        >
          {sortIcon}
        </Button>
      </OverlayTrigger>
    );
  }

  render() {
    const { showCollectionTree } = this.props;
    const {
      visible, inboxVisible, numberOfAttachments, collectorAddress, colMdValue
    } = this.state;

    const panelClass = showCollectionTree ? `small-col col-md-${colMdValue}` : 'small-col col-md-5';
    const inboxDisplay = inboxVisible ? '' : 'none';

    if (visible) {
      return (
        <Draggable
          handle=".handle"
          bounds="body"
        >
          <div
            className={panelClass}
            style={{
              zIndex: 10, position: 'absolute', top: '70px', left: '10px'
            }}
          >
            <Panel bsStyle="primary" className="eln-panel-detail research-plan-details cursor">
              <Panel.Heading
                className="cursor handle draggable"
                id="draggableInbox"
                onMouseDown={this.handleMouseDown}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'
                }}
                >
                  <div>
                    <button
                      type="button"
                      className="btn-inbox"
                      onClick={() => this.onClickInbox()}
                    >
                      <i className="fa fa-inbox" />
                      <span style={{ marginLeft: '10px', marginRight: '5px', fontWeight: 'bold' }}>Inbox</span>
                    </button>
                    {
                      numberOfAttachments > 0 ? (
                        <Badge>
                          &nbsp;
                          {numberOfAttachments}
                          &nbsp;
                        </Badge>
                      ) : ''
                    }
                  </div>
                  <div>
                    {this.renderSortButton()}
                    {collectorAddress ? this.collectorAddressInfoButton() : null}
                    {this.renderSizingIcon()}
                    <Button
                      bsStyle="success"
                      bsSize="xs"
                      className="header-button"
                      onClick={() => this.refreshInbox()}
                    >
                      <i className="fa fa-refresh" />
                    </Button>
                    <Button
                      bsStyle="danger"
                      bsSize="xs"
                      className="header-button"
                      onClick={InboxActions.toggleInboxModal}
                    >
                      <i className="fa fa-close" />
                    </Button>
                  </div>
                </div>
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
