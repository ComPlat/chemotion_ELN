import React, {
  useCallback, useContext, useEffect, useRef, useState
} from 'react';
import Draggable from 'react-draggable';
import {
  Badge, Button, CloseButton, Pagination, OverlayTrigger, Tooltip, Dropdown, DropdownButton, Card,
  ButtonToolbar
} from 'react-bootstrap';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

import DeviceBox from 'src/apps/mydb/inbox/DeviceBox';
import UnsortedBox from 'src/apps/mydb/inbox/UnsortedBox';
// eslint-disable-next-line import/no-extraneous-dependencies
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { StoreContext } from 'src/stores/mobx/RootStore';

const InboxModal = () => {
  const { userStore } = useContext(StoreContext);
  const filters = userStore.profile?.data?.filters || {};

  const inboxState = InboxStore.getState();
  const [inbox, setInbox] = useState(inboxState.inbox);
  const [inboxVisible, setInboxVisible] = useState(inboxState.inboxVisible);
  const [numberOfAttachments, setNumberOfAttachments] = useState(inboxState.numberOfAttachments);
  const [visible, setVisible] = useState(inboxState.inboxModalVisible);

  const [currentPage, setCurrentPage] = useState(inboxState.currentPage);
  const [itemsPerPage, setItemPerPage] = useState(inboxState.itemsPerPage);
  const [totalPages, setTotalPages] = useState(inboxState.totalPages);
  const [activeDeviceBoxId, setActiveDeviceBoxId] = useState(inboxState.activeDeviceBoxId);
  const [sortColumn, setSortColumn] = useState(filters['inbox']?.sort || 'name');
  const [colMdValue, setColMdValue] = useState(4);
  const [collectorAddress, setCollectorAddress] = useState();

  const onInboxStoreChange = useCallback((state) => {
    setInbox(state.inbox);
    setInboxVisible(state.inboxVisible);
    setNumberOfAttachments(state.numberOfAttachments);
    setCurrentPage(state.currentPage);
    setItemPerPage(state.itemsPerPage);
    setTotalPages(state.totalPages);
    setActiveDeviceBoxId(state.activeDeviceBoxId);
    setVisible(state.inboxModalVisible);
  }, []);

  const onUIStoreChange = useCallback((state) => {
    if (state.collectorAddress !== collectorAddress) {
      setCollectorAddress(state.collectorAddress);
    }
  }, [collectorAddress]);

  useEffect(() => {
    InboxStore.listen(onInboxStoreChange);
    InboxActions.fetchInboxCount();

    return () => InboxStore.unlisten(onInboxStoreChange);
  }, [onInboxStoreChange]);

  useEffect(() => {
    UIStore.listen(onUIStoreChange);
    return () => UIStore.unlisten(onUIStoreChange);
  }, [onUIStoreChange]);

  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) {
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    } else {
      didMount.current = true;
    }
  }, [currentPage, itemsPerPage]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      InboxActions.setInboxPagination({ currentPage: pageNumber });
    }
  };

  const onClickInbox = () => {
    InboxActions.setInboxVisible({ inboxVisible: !inboxVisible });
    if (!inbox.children) {
      LoadingActions.start();
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    }
  };

  const handleSizingIconClick = (size) => {
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
    setColMdValue(newColMdValue);
    InboxActions.changeInboxSize(size);
  };

  const getSizeLabel = () => {
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

  const updateFilterAtUserProfile = (type, sort) => {
    userStore.updateUserProfileValues({
      data: {
        filters: {
          [type]: {
            sort,
          },
        },
      },
    });
  };

  const changeSortColumn = () => {
    const type = 'inbox';
    console.log(sortColumn);
    const sort = sortColumn === 'created_at' ? 'name' : 'created_at';
    setSortColumn(sort);
    updateFilterAtUserProfile(type, sort);
  };

  const handleMouseMove = (e) => {
    // Update the position of the div based on the mouse movement
    const div = document.getElementById('draggableInbox');
    div.style.left = `${e.clientX}px`;
    div.style.top = `${e.clientY}px`;
  };

  const handleMouseUp = () => {
    // Remove the event listeners when the dragging is finished
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const refreshInbox = () => {
    LoadingActions.start();
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  };

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    const minPage = Math.max(currentPage - 4, 1);
    const maxPage = Math.min(minPage + 4, totalPages);
    const pageRange = Array.from(
      { length: maxPage - minPage + 1 },
      (_, idx) => minPage + idx
    );

    const pageNumbers = pageRange.map((page) => (
      <Pagination.Item
        key={page}
        active={page === currentPage}
        onClick={() => handlePageChange(page)}
      >
        {page}
      </Pagination.Item>
    ));

    if (totalPages > maxPage) {
      pageNumbers.push(<Pagination.Ellipsis key="Ell" />);
    }

    return (
      <div className="mt-1">
        <Pagination>
          <Pagination.First disabled={currentPage === 1} key="First" onClick={() => handlePageChange(1)} />
          <Pagination.Prev
            disabled={currentPage === 1}
            key="Prev"
            onClick={() => handlePageChange(currentPage - 1)}
          />
          {pageNumbers}
          <Pagination.Next
            disabled={currentPage === totalPages}
            key="Next"
            onClick={() => handlePageChange(currentPage + 1)}
          />
          <Pagination.Last
            disabled={currentPage === totalPages}
            key="Last"
            onClick={() => handlePageChange(totalPages)}
          />
        </Pagination>
      </div>
    );
  };

  const inboxSubtrees = () => {
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
        {renderPagination()}
        {inbox.unlinked_attachments && (
          <UnsortedBox
            key="unsorted_box"
            unsorted_box={inbox.unlinked_attachments}
            unsortedVisible={activeDeviceBoxId === -1}
            largerInbox
          />
        )}
      </div>
    );
  };

  const infoMessage = () => (
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

  const renderSizingIcon = () => {
    const tooltipText = `Change inbox size (Currently: ${getSizeLabel()})`;
    const sizes = ['Small', 'Medium', 'Large'];

    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="inbox_size_tooltip">{tooltipText}</Tooltip>}
      >
        <DropdownButton
          title="Size"
          variant="light"
          size="sm"
          onSelect={(size) => handleSizingIconClick(size)}
        >
          {sizes.map((size) => (
            <Dropdown.Item key={size} eventKey={size}>
              {size}
            </Dropdown.Item>
          ))}
        </DropdownButton>
      </OverlayTrigger>
    );
  };

  const collectorAddressInfoButton = () => (
      <OverlayTrigger
        placement="bottom"
        overlay={infoMessage()}
      >
        <CopyToClipboard
          text={collectorAddress}
        >
          <Button size="xsm">
            <i className="fa fa-info" />
          </Button>
        </CopyToClipboard>
      </OverlayTrigger>
    );

  const renderSortButton = () => {
    const sortTitle = sortColumn === 'name'
      ? 'click to sort datasets and attachments by creation date (descending) - currently sorted alphabetically'
      : 'click to sort datasets and attachments alphabetically - currently sorted by creation date (descending)';
    const sortTooltip = <Tooltip id="inbox_sort_tooltip">{sortTitle}</Tooltip>;
    const sortIconClass = sortColumn === 'name' ? 'fa-sort-alpha-asc' : 'fa-clock-o';
    const sortIcon = <i className={`fa ${sortIconClass}`} />;
    return (
      <OverlayTrigger placement="bottom" overlay={sortTooltip}>
        <Button
          variant="light"
          size="xsm"
          onClick={changeSortColumn}
        >
          {sortIcon}
        </Button>
      </OverlayTrigger>
    );
  };

  if (!visible) { return null; }

  return (
    <Draggable
      handle=".handle"
      bounds="body"
    >
      <div
        className={`small-col col-md-${colMdValue}`}
        style={{
          zIndex: 10,
          position: 'absolute',
          top: '70px',
          left: '10px'
        }}
      >
        <Card className="cursor">
          <Card.Header
            className="cursor handle draggable border-gray-600 bg-gray-300"
            id="draggableInbox"
            onMouseDown={handleMouseDown}
          >
            <div className="d-flex justify-content-between align-items-center w-100">
              <div>
                <button
                  type="button"
                  className="border-0 bg-transparent"
                  onClick={() => onClickInbox()}
                >
                  <i className="fa fa-inbox" />
                  <span className="ms-2 me-1 fw-bold">Inbox</span>
                </button>
                {
                  numberOfAttachments > 0
                  && (
                    <Badge bg="warning" className="mx-1">{numberOfAttachments}</Badge>
                  )
                }
              </div>
              <ButtonToolbar>
                {renderSortButton()}
                {collectorAddress && collectorAddressInfoButton()}
                {renderSizingIcon()}
                <Button
                  variant="light"
                  size="xsm"
                  onClick={() => refreshInbox()}
                >
                  <i className="fa fa-refresh" />
                </Button>
                <CloseButton
                  className="ms-2"
                  onClick={InboxActions.toggleInboxModal}
                />
              </ButtonToolbar>
            </div>
          </Card.Header>
          <Card.Body>
            <div>
              {inboxVisible ? (
                inboxSubtrees()
              ) : (
                <div>
                  <Button
                    variant="light"
                    onClick={() => onClickInbox()}
                  >
                    <i className="fa fa-inbox" />
                    <span className="ms-2">Fetch Inbox</span>
                  </Button>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>
    </Draggable>
  );
};

export default InboxModal;
