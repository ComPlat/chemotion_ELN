import React, {
  useState, useEffect, useContext, useRef, useCallback
} from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  Button, Card, Row, Col, Nav, Pagination, InputGroup, Form
} from 'react-bootstrap';
import 'whatwg-fetch';
import _ from 'lodash';
import AppModal from 'src/components/common/AppModal';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import { formatDate } from 'src/utilities/timezoneHelper';
import UIStore from 'src/stores/alt/stores/UIStore';

import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

const changeUrl = (url, urlTitle) => (url ? (
  <a href={url} target="_blank" rel="noopener noreferrer">
    {urlTitle || url}
  </a>
) : (
  <span />
));

const handleNotification = (nots, act, context, needCallback = true) => {
  let count = 0;
  nots.forEach((n) => {
    if (act === 'rem') {
      NotificationActions.removeByUid(n.id);
    }
    if (act === 'add') {
      count += 1;
      if (count > 3) {
        return;
      }
      const infoTimeString = formatDate(n.created_at);

      const newText = n.content.data
        .split('\n')
        .map((i) => <p key={`${infoTimeString}-${i}`}>{i}</p>);
      const { url, urlTitle } = n.content;
      if (url) {
        newText[newText.length] = (
          <p key={`${infoTimeString}-${url}`}>{changeUrl(url, urlTitle)}</p>
        );
      }

      const notification = {
        title: `From ${n.sender_name} on ${infoTimeString}`,
        message: newText,
        level: n.content.level || 'warning',
        dismissible: 'button',
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
      NotificationActions.add(notification);

      const { currentPage, itemsPerPage } = InboxStore.getState();
      const { currentCollection } = UIStore.getState();
      const currentCollectionId = currentCollection?.id;

      const refreshCollectionActions = [
        'CollectionActions.fetchRemoteCollectionRoots',
        'CollectionActions.fetchSyncInCollectionRoots',
        'RefreshChemotionCollection',
        'CollectionActions.fetchUnsharedCollectionRoots',
      ];
      if (refreshCollectionActions.includes(n.content.action) || n.subject === 'Shared Collection With Me') {
        context.collections.fetchCollections();
      }

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

  if (count > 3) {
    const notification = {
      title: `You have ${count - 3} more notification${count > 4 ? 's' : ''}`,
      level: 'warning',
      autoDismiss: 5,
      position: 'tr',
    };

    NotificationActions.add(notification);
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

export default function NoticeButton() {
  const context = useContext(StoreContext);
  const intervalRef = useRef(null);
  const prevDbNoticesRef = useRef([]);
  const prevServerVersionRef = useRef('');

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
        result.messages.forEach((message) => {
          if (message.subject === 'Send TPA attachment arrival notification') {
            attachmentNotificationStore.addMessage(message);
          }
        });
        result.messages.sort((a, b) => b.id - a.id);
        setNewNotices(result.messages);
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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [currentPage, totalPages]);

  const renderBody = () => {
    if (allNotices.length === 0) {
      return (
        <Card className="text-center" eventKey="0">
          <Card.Body>{`No ${showAck ? '' : 'new'} notifications.`}</Card.Body>
        </Card>
      );
    }

    const start = (currentPage - 1) * perPage;
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

          const newText = not.content.data
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
        {totalPages > 1 && (
          <Pagination className="justify-content-center mt-3">
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            />
            {[...Array(totalPages).keys()].map((key, i) => (
              <Pagination.Item
                key={`page_${key}`}
                active={i + 1 === currentPage}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            />
          </Pagination>
        )}
      </>
    );
  };

  const renderModal = useCallback(() => (
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
  ), [showModal, handleHide, renderBody, messageAck]);

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
      handleNotification(newMessages, 'add', context, true);
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
}
