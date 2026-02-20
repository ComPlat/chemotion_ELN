import React, {
  useState, useEffect, useContext, useRef, useCallback
} from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  Button, Modal, Card, Row, Col
} from 'react-bootstrap';
import 'whatwg-fetch';
import _ from 'lodash';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
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

const handleNotification = (nots, act, needCallback = true) => {
  nots.forEach((n) => {
    if (act === 'rem') {
      NotificationActions.removeByUid(n.id);
    }
    if (act === 'add') {
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
              // .then((result) => { console.log(JSON.stringify(result)); });
            }
          },
        },
      };
      NotificationActions.add(notification);

      const { currentPage, itemsPerPage } = InboxStore.getState();

      const { currentCollection } = UIStore.getState();
      const currentCollectionId = currentCollection ? currentCollection.id : null;

      switch (n.content.action) {
        case 'CollectionActions.fetchRemoteCollectionRoots':
          CollectionActions.fetchRemoteCollectionRoots();
          break;
        case 'CollectionActions.fetchSyncInCollectionRoots':
          CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'InboxActions.fetchInbox':
          InboxActions.fetchInbox({ currentPage, itemsPerPage });
          break;
        case 'ReportActions.updateProcessQueue':
          ReportActions.updateProcessQueue([parseInt(n.content.report_id, 10)]);
          break;
        case 'ElementActions.refreshComputedProp':
          ElementActions.refreshComputedProp(n.content.cprop);
          break;
        case 'RefreshChemotionCollection':
          CollectionActions.fetchUnsharedCollectionRoots();
          break;
        case 'CollectionActions.fetchUnsharedCollectionRoots':
          CollectionActions.fetchUnsharedCollectionRoots();
          CollectionActions.fetchSyncInCollectionRoots();
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
          if (currentCollectionId && currentCollectionId === n.content?.collection_id) {
            ElementActions.fetchSamplesByCollectionId(
              parseInt(currentCollection.id, 10)
            );
          }
          break;
        default:
        //
      }
    }
  });
};

const createUpgradeNotification = (serverVersion, localVersion) => {
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
  handleNotification([not], 'add', false);
};

export default function NoticeButton() {
  const context = useContext(StoreContext);
  const intervalRef = useRef(null);
  const prevDbNoticesRef = useRef([]);
  const prevServerVersionRef = useRef('');

  const [showModal, setShowModal] = useState(false);
  const [dbNotices, setDbNotices] = useState([]);
  const [messageEnable, setMessageEnable] = useState(true);
  const [messageAutoInterval, setMessageAutoInterval] = useState(6000);
  const [lastActivityTime, setLastActivityTime] = useState(new Date());
  const [idleTimeout, setIdleTimeout] = useState(12);
  const [serverVersion, setServerVersion] = useState('');
  const [localVersion, setLocalVersion] = useState('');

  // Render calculations
  const noticeNum = Object.keys(dbNotices).length;
  const btnIcon = noticeNum > 0 ? 'fa-bell' : 'fa-bell-o';

  const detectActivity = useCallback(() => {
    setLastActivityTime(new Date());
  }, []);

  const messageFetch = useCallback(() => {
    const clientLastActivityTime = new Date(lastActivityTime).getTime();
    const currentTime = new Date().getTime();
    const remainTime = Math.floor(
      (currentTime - clientLastActivityTime) / 1000
    );
    if (remainTime < idleTimeout) {
      const { attachmentNotificationStore } = context;
      MessagesFetcher.fetchMessages(0).then((result) => {
        result.messages.forEach((message) => {
          if (message.subject === 'Send TPA attachment arrival notification') {
            attachmentNotificationStore.addMessage(message);
          }
        });
        result.messages.sort((a, b) => a.id - b.id);
        setDbNotices(result.messages);
        setServerVersion(result.version);
      });
    }
  }, [lastActivityTime, idleTimeout, context]);

  const startActivityDetection = useCallback(() => {
    if (messageEnable === true) {
      intervalRef.current = setInterval(messageFetch, messageAutoInterval);
      document.addEventListener('mousemove', detectActivity);
      document.addEventListener('click', detectActivity);
    }
  }, [messageEnable, messageAutoInterval, messageFetch, detectActivity]);

  const stopActivityDetection = useCallback(() => {
    if (messageEnable === true) {
      document.removeEventListener('mousemove', detectActivity, false);
      document.removeEventListener('click', detectActivity, false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [messageEnable, detectActivity]);

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

      setMessageEnable(newMessageEnable);
      setMessageAutoInterval(newMessageAutoInterval);
      setIdleTimeout(result.idleTimeout);
      setLocalVersion(applicationTagValue);

      if (newMessageEnable === true) {
        intervalRef.current = setInterval(messageFetch, newMessageAutoInterval);
        document.addEventListener('mousemove', detectActivity);
        document.addEventListener('click', detectActivity);
      } else {
        messageFetch();
      }
    });
  }, [messageFetch, detectActivity]);

  const handleShow = useCallback(() => {
    MessagesFetcher.fetchMessages(0).then((result) => {
      result.messages.sort((a, b) => a.id - b.id);
      setShowModal(true);
      setDbNotices(result.messages);
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
      params.ids = _.map(dbNotices, 'id');
    } else {
      params.ids[0] = idx;
    }
    MessagesFetcher.acknowledgedMessage(params).then((result) => {
      const ackIds = _.map(result.ack, 'id');
      const filteredNotices = _.filter(
        dbNotices,
        (o) => !_.includes(ackIds, o.id)
      );
      filteredNotices.sort((a, b) => a.id - b.id);
      setDbNotices(filteredNotices);
    });
  }, [dbNotices]);

  const renderBody = useCallback(() => {
    if (dbNotices.length === 0) {
      return (
        <Card className="text-center" eventKey="0">
          <Card.Body>No new notifications.</Card.Body>
        </Card>
      );
    }

    return dbNotices.map((not, index) => {
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
                <Button
                  id={`notice-button-ack-${not.id}`}
                  key={`notice-button-ack-${not.id}`}
                  onClick={() => messageAck(not.id, false)}
                >
                  <i className="fa fa-check me-1" aria-hidden="true" />
                  Got it
                </Button>
              </Col>
              <Col>{newText}</Col>
            </Row>
          </Card.Body>
        </Card>
      );
    });
  }, [dbNotices, messageAck]);

  const renderModal = useCallback(() => (
    <Modal
      centered
      show={showModal}
      onHide={handleHide}
      dialogClassName="modal-xl"
    >
      <Modal.Header closeButton>
        <Modal.Title>Unread Notifications</Modal.Title>
      </Modal.Header>
      <Modal.Body className="vh-70 overflow-auto">
        {renderBody()}
      </Modal.Body>
      <Modal.Footer>
        <Button
          id="notice-button-ack-all"
          key="notice-button-ack-all"
          onClick={() => messageAck(0, true)}
        >
          <i className="fa fa-check" aria-hidden="true" />
          &nbsp;Mark all notifications as read
        </Button>
      </Modal.Footer>
    </Modal>
  ), [showModal, handleHide, renderBody, messageAck]);

  // Component mount effect
  useEffect(() => {
    envConfiguration();
    startActivityDetection();

    return () => {
      stopActivityDetection();
    };
  }, [envConfiguration, startActivityDetection, stopActivityDetection]);

  // Handle notifications when dbNotices change
  useEffect(() => {
    const prevNots = prevDbNoticesRef.current;
    const currentNots = dbNotices;

    const prevNotIds = _.map(prevNots, 'id');
    const currentNotIds = _.map(currentNots, 'id');
    const newMessages = _.filter(currentNots, (o) => !_.includes(prevNotIds, o.id));
    const remMessages = _.filter(prevNots, (o) => !_.includes(currentNotIds, o.id));

    if (Object.keys(newMessages).length > 0) {
      handleNotification(newMessages, 'add');
    }
    if (Object.keys(remMessages).length > 0) {
      handleNotification(remMessages, 'rem');
    }

    prevDbNoticesRef.current = dbNotices;
  }, [dbNotices]);

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
        createUpgradeNotification(serverVer, localVer);
      }
    }

    prevServerVersionRef.current = serverVersion;
  }, [serverVersion, localVersion]);

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
