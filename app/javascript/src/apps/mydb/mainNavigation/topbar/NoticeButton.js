import React, {
  useState, useEffect, useContext, useRef, useCallback
} from 'react';
import { StoreContext , rootStore } from 'src/stores/mobx/RootStore';
import {
  Button, Card, Row, Col, Nav, Pagination, InputGroup, Form
} from 'react-bootstrap';
import 'whatwg-fetch';
import _ from 'lodash';
import AppModal from 'src/components/common/AppModal';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import { formatDate, convertCalendarNotificationToLocal } from 'src/utilities/timezoneHelper';
import UIStore from 'src/stores/alt/stores/UIStore';

import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

const MAX_VISIBLE_PAGES = 5;

const getPaginationRange = (currentPage, totalPages, maxVisible) => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (unused, i) => i + 1);
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(currentPage - half, 1);
  let end = start + maxVisible - 1;
  if (end > totalPages) {
    end = totalPages;
    start = end - maxVisible + 1;
  }
  return Array.from({ length: end - start + 1 }, (unused, i) => start + i);
};

const changeUrl = (url, urlTitle) => (url ? (
  <a href={url} target="_blank" rel="noopener noreferrer">
    {urlTitle || url}
  </a>
) : (
  <span />
));

// Any notification on one of these subjects means the recipient's collection visibility changed
// server-side (a share was created/updated/revoked, or an ownership offer was accepted) — refetch
// so their tree reflects it without waiting for a page reload.
const refreshCollectionSubjects = ['Shared Collection With Me', 'Collection Take Ownership'];
// Legacy action names, predating the subject-based check above, still seeded into Channel.msg_template
// by old migrations for channels no later migration ever re-pointed at the new subject list: Gate
// Transfer (db/migrate/20181207100526_add_gate_transfer_notification.rb), Collection Zip import/export
// and Samples Import (db/migrate/20190617144801_add_collection_zip_notification.rb,
// db/migrate/20230531142756_add_samples_import_channel.rb). PR #2783 deliberately re-pointed these same
// strings at the (then-new) MobX fetchCollections() call rather than dropping them — this branch has to
// stay independently of the subject check above, or those three channels silently stop refreshing the
// tree.
const refreshCollectionActions = [
  'CollectionActions.fetchRemoteCollectionRoots',
  'CollectionActions.fetchSyncInCollectionRoots',
  'RefreshChemotionCollection',
  'CollectionActions.fetchUnsharedCollectionRoots',
];

const matchesCollectionRefresh = (n) => refreshCollectionSubjects.includes(n.subject)
  || refreshCollectionActions.includes(n.content.action);

const handleNotification = (nots, act, context, needCallback = true, isFirstBatch = false) => {
  let count = 0;

  // Computed once over the full, uncapped batch — decoupled from the count>3 toast-spam cap below (a
  // notification past the cap still needs the tree to refresh, it just doesn't get its own toast) — and
  // skipped entirely for the very first batch after mount: CollectionTree.js already fetches the tree
  // fresh on its own mount effect, well before this component's first poll can fire, so refetching again
  // here for a backlog of notifications accumulated since the user's last login is redundant. Any
  // notification that arrives too early to benefit from that self-heals on the next poll cycle.
  const shouldRefreshCollections = act === 'add' && !isFirstBatch && nots.some(matchesCollectionRefresh);

  nots.forEach((n) => {
    if (act === 'rem') {
      rootStore.notificationsStore.removeByUid(n.id);
    }
    if (act === 'add') {
      count += 1;
      if (count > 3) {
        return;
      }
      const infoTimeString = formatDate(n.created_at);
      const convertedData = convertCalendarNotificationToLocal(n.content.data);

      const newText = convertedData
        .split('\n')
        .map((i) => <p key={`${infoTimeString}-${i}`}>{i}</p>);
      const { url, urlTitle } = n.content;
      if (url) {
        newText[newText.length] = (
          <p key={`${infoTimeString}-${url}`}>{changeUrl(url, urlTitle)}</p>
        );
      }

      // Silent notifications (e.g. a share permission update/revoke, or a rename — see
      // CollectionShareNotifier on the backend) are delivered so the switch below and the tree-refresh
      // check can act on them, but must not interrupt the user with a dismiss-required popup; the
      // backend auto-acknowledges them on delivery instead (see MessageAPI's list endpoint).
      if (!n.content.silent) {
        const notification = {
          title: `From ${n.sender_name} on ${infoTimeString}`,
          message: newText,
          level: n.content.level || 'warning',
          autoDismiss: n.content.autoDismiss || 5,
          position: n.content.position || 'tr',
          uid: n.id,
          action: {
            label: (
              <span>
                <i className="fa fa-check" aria-hidden="true" />
                &nbsp;&nbsp;Got it
              </span>
            ),
            callback() {
              if (needCallback) {
                const params = { ids: [] };
                params.ids[0] = n.id;
                MessagesFetcher.acknowledgedMessage(params);
              }
            },
          },
        };
        rootStore.notificationsStore.add(notification);
      }

      const { currentPage, itemsPerPage } = InboxStore.getState();
      const { currentCollection } = UIStore.getState();
      const currentCollectionId = currentCollection?.id;

      switch (n.content.action) {
        case 'InboxActions.fetchInbox':
          InboxActions.fetchInbox({ currentPage, itemsPerPage });
          break;
        case 'ReportActions.updateProcessQueue':
          ReportActions.updateProcessQueue([parseInt(n.content.report_id, 10)]);
          break;
        case 'ElementActions.refreshComputedProp':
          ElementActions.refreshComputedProp(n.content.cprop);
          break;
        case 'ElementActions.fetchResearchPlanById':
          ElementActions.fetchResearchPlanById(
            parseInt(n.content.research_plan_id, 10)
          );
          break;
        case 'CalendarActions.navigateToElement':
          CalendarActions.navigateToElement(
            n.content.eventable_type,
            n.content.eventable_id
          );
          break;
        case 'RefreshSampleList':
          if (currentCollectionId != null && currentCollectionId === n.content?.collection_id) {
            ElementActions.fetchSamplesByCollectionId(
              parseInt(currentCollectionId, 10)
            );
          }
          break;
        default:
      }
    }
  });

  if (shouldRefreshCollections) {
    context.collections.fetchCollections();
  }

  if (count > 3) {
    const notification = {
      title: `You have ${count - 3} more notification${count > 4 ? 's' : ''}`,
      level: 'warning',
      autoDismiss: 5,
      position: 'tr',
    };

    rootStore.notificationsStore.add(notification);
  }
};

const createUpgradeNotification = (serverVersion, localVersion, context) => {
  const content = [
    'Dear ELNer,',
    'A new version has been released. Please reload this page to enjoy the latest updates.',
    'Thank you and have a nice day  :)',
    '--------------------------',
    `Your version: ${localVersion}`,
    `Current version: ${serverVersion}`,
    '--------------------------',
  ].join('\n');
  const contentJson = {
    data: content,
    url: '/about',
    urlTitle: "Check what's new here",
  };
  const infoTimeString = formatDate(new Date().toString());
  const not = {
    id: -1,
    sender_name: 'System Administrator',
    updated_at: infoTimeString,
    content: contentJson,
  };
  handleNotification([not], 'add', context, false);
};

const NoticeButton = () => {
  const context = useContext(StoreContext);
  const intervalRef = useRef(null);
  const prevDbNoticesRef = useRef([]);
  const prevServerVersionRef = useRef('');
  // Set to false after the first 'add' batch actually runs — see handleNotification's isFirstBatch.
  const isFirstNotificationBatchRef = useRef(true);

  // Use refs for values needed inside the polling interval to avoid
  // stale closures and prevent useCallback/useEffect churn that would
  // restart the interval on every mouse move / state update.
  const lastActivityTimeRef = useRef(new Date());
  const idleTimeoutRef = useRef(12);
  const messageEnableRef = useRef(true);
  const messageAutoIntervalRef = useRef(6000);

  const [showModal, setShowModal] = useState(false);
  const [newNotices, setNewNotices] = useState([]);
  const [ackNotices, setAckNotices] = useState([]);
  const [serverVersion, setServerVersion] = useState('');
  const [localVersion, setLocalVersion] = useState('');
  const [showAck, setShowAck] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;
  const [filterNotices, setFilterNotices] = useState('');

  // Render calculations
  const noticeNum = newNotices.length;
  const btnIcon = noticeNum > 0 ? 'fa-bell' : 'fa-bell-o';

  // Stable: reads from ref, never needs to change
  const detectActivity = useCallback(() => {
    lastActivityTimeRef.current = new Date();
  }, []);

  // Stable: reads from refs, no state dependencies that change
  const messageFetch = useCallback(() => {
    const clientLastActivityTime = lastActivityTimeRef.current.getTime();
    const currentTime = new Date().getTime();
    const remainTime = Math.floor(
      (currentTime - clientLastActivityTime) / 1000
    );
    if (remainTime < idleTimeoutRef.current) {
      const { attachmentNotificationStore } = context;
      MessagesFetcher.fetchMessages(0).then((result) => {
        const messages = result?.messages;
        if (!Array.isArray(messages)) { return; }
        messages.forEach((message) => {
          if (message.subject === 'Send TPA attachment arrival notification') {
            attachmentNotificationStore.addMessage(message);
          }
        });
        messages.sort((a, b) => b.id - a.id);
        setNewNotices(messages);
        setServerVersion(result.version);
      });
    }
  }, [context]);

  // Stable: reads messageEnable/interval from refs
  const stopActivityDetection = useCallback(() => {
    if (messageEnableRef.current === true) {
      document.removeEventListener('mousemove', detectActivity, false);
      document.removeEventListener('click', detectActivity, false);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [detectActivity]);

  // Stable: called once on mount via envConfiguration
  const startPolling = useCallback((interval) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(messageFetch, interval);
    document.addEventListener('mousemove', detectActivity);
    document.addEventListener('click', detectActivity);
  }, [messageFetch, detectActivity]);

  // Stable: no dependencies that change after mount
  const envConfiguration = useCallback(() => {
    // use 'application' (not 'application-') as keyword because there is a
    // difference between production and development environment
    const documentIndex = 'application';
    const applicationTag = _.filter(
      document.scripts,
      (s) => s.src.indexOf(documentIndex) > -1
    );
    const applicationTagValue = applicationTag[0].src.substr(
      applicationTag[0].src.indexOf(documentIndex)
    );
    MessagesFetcher.configuration().then((result) => {
      const newMessageEnable = result.messageEnable === 'true';
      const newMessageAutoInterval = result.messageAutoInterval;

      // Sync refs before starting interval so messageFetch sees correct values
      messageEnableRef.current = newMessageEnable;
      messageAutoIntervalRef.current = newMessageAutoInterval;
      idleTimeoutRef.current = result.idleTimeout;

      setLocalVersion(applicationTagValue);

      if (newMessageEnable === true) {
        startPolling(newMessageAutoInterval);
      } else {
        messageFetch();
      }
    });
  }, [messageFetch, startPolling]);

  const handleShow = useCallback(() => {
    Promise.all([
      MessagesFetcher.fetchMessages(1), // acknowledged
      MessagesFetcher.fetchMessages(0), // unread
    ]).then(([ackResult, unreadResult]) => {
      const ackMessages = ackResult.messages.sort((a, b) => b.id - a.id);
      const unreadMessages = unreadResult.messages.sort((a, b) => b.id - a.id);

      setAckNotices(ackMessages);
      setNewNotices(unreadMessages);
      setShowModal(true);
    });
  }, []);

  const handleHide = useCallback(() => {
    setShowModal(false);
  }, []);

  const messageAck = useCallback((idx, ackAll) => {
    const params = {
      ids: [],
    };
    if (ackAll) {
      params.ids = _.map(newNotices, 'id');
    } else {
      params.ids = [idx];
    }
    MessagesFetcher.acknowledgedMessage(params).then((result) => {
      const ackIdSet = new Set(_.map(result.ack, 'id'));

      setNewNotices((prev) => prev
        .filter((o) => !ackIdSet.has(o.id))
        .sort((a, b) => b.id - a.id));

      setAckNotices((prev) => [
        ...prev,
        ...newNotices.filter((o) => ackIdSet.has(o.id)),
      ]);
    });
  }, [newNotices]);

  const messageArc = useCallback((idx) => {
    const params = {
      ids: [idx],
      archive: true,
    };

    MessagesFetcher.acknowledgedMessage(params).then((result) => {
      const ackIdSet = new Set(_.map(result.ack, 'id'));

      setAckNotices((prevAckNotices) => prevAckNotices
        .filter((o) => !ackIdSet.has(o.id))
        .sort((a, b) => b.id - a.id));
    });
  }, []);

  const allNotices = [
    ...newNotices.map((n) => ({ ...n, source: 'new' })),
    ...(showAck ? ackNotices.map((n) => ({ ...n, source: 'ack' })) : [])
  ].sort((a, b) => b.id - a.id);

  const search = filterNotices?.toLowerCase() || '';

  const filteredNotices = allNotices.filter((not) => (
    not.subject.toLowerCase().includes(search)
  || not.sender_name.toLowerCase().includes(search)
  || not.content.data.toLowerCase().includes(search)
  ));

  const totalPages = Math.ceil(filteredNotices.length / perPage);
  const effectivePage = Math.min(currentPage, totalPages || 1);

  const renderBody = () => {
    if (allNotices.length === 0) {
      return (
        <Card className="text-center" eventKey="0">
          <Card.Body>{`No ${showAck ? '' : 'new'} notifications.`}</Card.Body>
        </Card>
      );
    }

    const start = (effectivePage - 1) * perPage;
    const end = start + perPage;

    return (
      <>
        <Row>
          <InputGroup className="mb-3">
            <InputGroup.Text><i className="fa fa-search" /></InputGroup.Text>
            <Form.Control
              type="text"
              value={filterNotices}
              onChange={(event) => {
                setFilterNotices(event.target.value);
                setCurrentPage(1);
              }}
            />
          </InputGroup>
        </Row>
        {filteredNotices.slice(start, end).map((not, index) => {
          const infoTimeString = formatDate(not.created_at);
          const convertedData = convertCalendarNotificationToLocal(not.content.data);

          const newText = convertedData
            .split('\n')
            .map((i) => <p key={`${infoTimeString}-${i}`}>{i}</p>);

          const { url, urlTitle } = not.content;
          if (url) {
            newText.push(
              <p key={`${infoTimeString}-${url}`}>{changeUrl(url, urlTitle)}</p>
            );
          }

          return (
            <Card
              key={`panel-modal-body-${not.id}`}
              eventKey={index}
              className="mb-3"
            >
              <Card.Header className="d-flex gap-2">
                <i className="fa fa-commenting-o" aria-hidden="true" />
                {not.subject}
                <span>
                  <strong>From: </strong>
                  {not.sender_name}
                </span>
                <span>
                  <strong>Created On: </strong>
                  {formatDate(not.created_at)}
                </span>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col lg="auto">
                    {not.source === 'new' ? (
                      <Button
                        id={`notice-button-ack-${not.id}`}
                        key={`notice-button-ack-${not.id}`}
                        size="sm"
                        variant="warning"
                        onClick={() => messageAck(not.id, false)}
                      >
                        <i className="fa fa-check me-1" aria-hidden="true" />
                        Got it
                      </Button>
                    ) : (
                      <Button
                        id={`notice-button-del-${not.id}`}
                        key={`notice-button-del-${not.id}`}
                        size="sm"
                        variant="danger"
                        onClick={() => messageArc(not.id)}
                      >
                        <i className="fa fa-archive me-1" aria-hidden="true" />
                        Archive
                      </Button>
                    )}
                  </Col>
                  <Col>{newText}</Col>
                </Row>
              </Card.Body>
            </Card>
          );
        })}
        {totalPages > 1 && (() => {
          const pageRange = getPaginationRange(effectivePage, totalPages, MAX_VISIBLE_PAGES);
          return (
            <Pagination className="justify-content-center mt-3">
              <Pagination.First
                disabled={effectivePage === 1}
                onClick={() => setCurrentPage(1)}
              />
              <Pagination.Prev
                disabled={effectivePage === 1}
                onClick={() => setCurrentPage(effectivePage - 1)}
              />
              {pageRange[0] > 1 && <Pagination.Ellipsis disabled />}
              {pageRange.map((page) => (
                <Pagination.Item
                  key={`page_${page}`}
                  active={page === effectivePage}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Pagination.Item>
              ))}
              {pageRange[pageRange.length - 1] < totalPages && <Pagination.Ellipsis disabled />}
              <Pagination.Next
                disabled={effectivePage === totalPages}
                onClick={() => setCurrentPage(effectivePage + 1)}
              />
              <Pagination.Last
                disabled={effectivePage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              />
            </Pagination>
          );
        })()}
      </>
    );
  };

  const renderModal = () => (
    <AppModal
      title="Notifications"
      show={showModal}
      onHide={handleHide}
      size="xl"
      bodyClassName="p-0"
      primaryActionLabel={newNotices.length > 0 ? 'Mark all as read' : undefined}
      onPrimaryAction={newNotices.length > 0 ? () => messageAck(0, true) : undefined}
    >
      <Nav variant="tabs" activeKey={showAck ? 'all' : 'unread'} className="px-3 pt-3">
        <Nav.Item>
          <Nav.Link eventKey="unread" onClick={() => setShowAck(false)}>
            {`Unread${newNotices.length > 0 ? ` (${newNotices.length})` : ''}`}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="all" onClick={() => setShowAck(true)}>
            All
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <div className="px-3 pb-3 vh-70 overflow-auto">
        {renderBody()}
      </div>
    </AppModal>
  );

  // Runs once on mount: fetch config, then start polling.
  // All dependencies are stable (never recreated), so this effect
  // will not re-fire after mount.
  useEffect(() => {
    envConfiguration();

    return () => {
      stopActivityDetection();
    };
  }, [envConfiguration, stopActivityDetection]);

  // Handle notifications when newNotices change
  useEffect(() => {
    const prevNots = prevDbNoticesRef.current;
    const currentNots = newNotices;

    const prevNotIds = _.map(prevNots, 'id');
    const currentNotIds = _.map(currentNots, 'id');
    const newMessages = _.filter(currentNots, (o) => !_.includes(prevNotIds, o.id));
    const remMessages = _.filter(prevNots, (o) => !_.includes(currentNotIds, o.id));

    if (Object.keys(newMessages).length > 0) {
      handleNotification(newMessages, 'add', context, true, isFirstNotificationBatchRef.current);
      isFirstNotificationBatchRef.current = false;
    }
    if (Object.keys(remMessages).length > 0) {
      handleNotification(remMessages, 'rem', context, true);
    }

    prevDbNoticesRef.current = newNotices;
  }, [newNotices, context]);

  // Handle version upgrade notifications
  useEffect(() => {
    if (
      serverVersion
      && localVersion
      && serverVersion !== prevServerVersionRef.current
      && serverVersion !== localVersion
    ) {
      const serverVer = serverVersion.substring(
        serverVersion.indexOf('-') + 1,
        serverVersion.indexOf('.js')
      );
      const localVer = localVersion.substring(
        localVersion.indexOf('-') + 1,
        localVersion.indexOf('.js')
      );
      if (serverVer !== localVer) {
        createUpgradeNotification(serverVer, localVer, context);
      }
    }

    prevServerVersionRef.current = serverVersion;
  }, [serverVersion, localVersion, context]);

  return (
    <>
      <NotificationButton
        label="Notifications"
        icon={btnIcon}
        onClick={handleShow}
        badgeCount={noticeNum}
      />
      {renderModal()}
    </>
  );
};

export default NoticeButton;
// Exported for unit testing only — see spec/javascripts/apps/mydb/mainNavigation/topbar/NoticeButton.spec.js.
export { handleNotification };
