import React from 'react';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  Button, Modal, Card, Row, Col, Pagination, InputGroup, Form
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

import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';

const changeUrl = (url, urlTitle) => (url ? (
  <a href={url} target="_blank" rel="noopener noreferrer">
    {urlTitle || url}
  </a>
) : (
  <span />
));

const handleNotification = (nots, act, needCallback = true) => {
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

export default class NoticeButton extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      newNotices: [],
      ackNotices: [],
      messageEnable: true,
      messageAutoInterval: 6000,
      lastActivityTime: new Date(),
      idleTimeout: 12,
      serverVersion: '',
      localVersion: '',
      showAck: false,
      currentPage: 1,
      perPage: 3,
      filterNotices: '',
    };
    this.envConfiguration = this.envConfiguration.bind(this);
    this.handleShow = this.handleShow.bind(this);
    this.handleHide = this.handleHide.bind(this);
    this.messageAck = this.messageAck.bind(this);
    this.messageArc = this.messageArc.bind(this);
    this.detectActivity = this.detectActivity.bind(this);
  }

  componentDidMount() {
    this.envConfiguration();
    this.startActivityDetection();
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { newNotices: nots } = this.state;
    const nextNots = nextState.newNotices;

    const notIds = _.map(nots, 'id');
    const nextNotIds = _.map(nextNots, 'id');
    const newMessages = _.filter(nextNots, (o) => !_.includes(notIds, o.id));
    const remMessages = _.filter(nots, (o) => !_.includes(nextNotIds, o.id));

    if (Object.keys(newMessages).length > 0) {
      handleNotification(newMessages, 'add');
    }
    if (Object.keys(remMessages).length > 0) {
      handleNotification(remMessages, 'rem');
    }
    if (
      nextState.serverVersion
      && nextState.localVersion
      && nextState.serverVersion !== this.state.serverVersion
      && nextState.serverVersion !== nextState.localVersion
    ) {
      const serverVer = nextState.serverVersion.substring(
        nextState.serverVersion.indexOf('-') + 1,
        nextState.serverVersion.indexOf('.js')
      );
      const localVer = nextState.localVersion.substring(
        nextState.localVersion.indexOf('-') + 1,
        nextState.localVersion.indexOf('.js')
      );
      if (serverVer !== localVer) {
        createUpgradeNotification(serverVer, localVer);
      }
    }

    return true;
  }

  componentWillUnmount() {
    this.stopActivityDetection();
  }

  handleShow() {
    MessagesFetcher.fetchMessages(1).then((result) => {
      result.messages.sort((a, b) => b.id - a.id);
      this.setState({ showModal: true, ackNotices: result.messages });
    });
  }

  handleHide() {
    this.setState({ showModal: false });
  }

  startActivityDetection() {
    const { messageEnable } = this.state;
    if (messageEnable === true) {
      this.interval = setInterval(this.messageFetch.bind(this), this.state.messageAutoInterval);
      document.addEventListener('mousemove', this.detectActivity);
      document.addEventListener('click', this.detectActivity);
    }
  }

  stopActivityDetection() {
    const { messageEnable } = this.state;
    if (messageEnable === true) {
      document.removeEventListener('mousemove', this.detectActivity, false);
      document.removeEventListener('click', this.detectActivity, false);
      clearInterval(this.interval);
    }
  }

  envConfiguration() {
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
      this.setState({
        messageEnable: result.messageEnable === 'true',
        messageAutoInterval: result.messageAutoInterval,
        idleTimeout: result.idleTimeout,
        localVersion: applicationTagValue,
      });
      const { messageEnable, messageAutoInterval } = this.state;

      if (messageEnable === true) {
        this.interval = setInterval(
          () => this.messageFetch(),
          messageAutoInterval
        );
        document.addEventListener('mousemove', this.detectActivity);
        document.addEventListener('click', this.detectActivity);
      } else {
        this.messageFetch();
      }
    });
  }

  detectActivity() {
    this.setState({ lastActivityTime: new Date() });
  }

  messageAck(idx, ackAll) {
    const { newNotices } = this.state;
    const params = {
      ids: [],
    };
    if (ackAll) {
      params.ids = _.map(newNotices, 'id');
    } else {
      params.ids[0] = idx;
    }
    MessagesFetcher.acknowledgedMessage(params).then((result) => {
      const ackIdSet = new Set(_.map(result.ack, 'id'));

      this.setState((prevState) => ({
        newNotices: prevState.newNotices
          .filter((o) => !ackIdSet.has(o.id))
          .sort((a, b) => b.id - a.id)
      }));
    });
  }

  messageArc(idx) {
    const params = {
      ids: [idx],
      archive: true,
    };

    MessagesFetcher.acknowledgedMessage(params).then((result) => {
      const ackIdSet = new Set(_.map(result.ack, 'id'));

      this.setState((prevState) => ({
        ackNotices: prevState.ackNotices
          .filter((o) => !ackIdSet.has(o.id))
          .sort((a, b) => b.id - a.id)
      }));
    });
  }

  messageFetch() {
    const { lastActivityTime, idleTimeout } = this.state;
    const { attachmentNotificationStore } = this.context;
    const clientLastActivityTime = new Date(lastActivityTime).getTime();
    const currentTime = new Date().getTime();
    const remainTime = Math.floor(
      (currentTime - clientLastActivityTime) / 1000
    );
    if (remainTime < idleTimeout) {
      MessagesFetcher.fetchMessages(0).then((result) => {
        result.messages.forEach((message) => {
          if (message.subject === 'Send TPA attachment arrival notification') {
            attachmentNotificationStore.addMessage(message);
          }
        });
        result.messages.sort((a, b) => b.id - a.id);
        this.setState({
          newNotices: result.messages,
          serverVersion: result.version,
        });
      });
    }
  }

  renderBody() {
    const {
      newNotices, ackNotices, showAck, currentPage, perPage, filterNotices
    } = this.state;

    if (!showAck && newNotices.length === 0) {
      return (
        <Card className="text-center" eventKey="0">
          <Card.Body>No new notifications.</Card.Body>
        </Card>
      );
    }

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
              onChange={(event) => this.setState({ filterNotices: event.target.value, currentPage: 1 })}
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
                    { not.source === 'new' ? (
                      <Button
                        id={`notice-button-ack-${not.id}`}
                        key={`notice-button-ack-${not.id}`}
                        size="sm"
                        variant="warning"
                        onClick={() => this.messageAck(not.id, false)}
                      >
                        <i className="fa fa-check me-1" aria-hidden="true" />
                        Got it
                      </Button>
                    )
                      : (
                        <Button
                          id={`notice-button-del-${not.id}`}
                          key={`notice-button-del-${not.id}`}
                          size="sm"
                          variant="danger"
                          onClick={() => this.messageArc(not.id)}
                        >
                          <i className="fa fa-check me-1" aria-hidden="true" />
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
              onClick={() => this.setState({ currentPage: currentPage - 1 })}
            />
            {[...Array(totalPages).keys()].map((key, i) => (
              <Pagination.Item
                key={`page_${key}`}
                active={i + 1 === currentPage}
                onClick={() => this.setState({ currentPage: i + 1 })}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => this.setState({ currentPage: currentPage + 1 })}
            />
          </Pagination>
        )}
      </>
    );
  }

  renderModal() {
    const { showModal, showAck } = this.state;
    return (
      <Modal
        centered
        show={showModal}
        onHide={this.handleHide}
        dialogClassName="modal-xl"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ width: '100%' }}>
            <Row>
              {showAck ? (
                <>
                  <Col xs="6">
                    All Notifications
                  </Col>
                  <Col>
                    <Button variant="info" onClick={() => this.setState({ showAck: false })}>
                      Hide acknowledged
                    </Button>
                  </Col>
                </>
              )
                : (
                  <>
                    <Col xs="6">
                      Unread Notifications
                    </Col>
                    <Col>
                      <Button variant="info" onClick={() => this.setState({ showAck: true })}>
                        Show acknowledged
                      </Button>
                    </Col>
                  </>
                )}
            </Row>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="vh-70 overflow-auto">
          {this.renderBody()}
        </Modal.Body>
        <Modal.Footer>
          <Button
            id="notice-button-ack-all"
            key="notice-button-ack-all"
            onClick={() => this.messageAck(0, true)}
          >
            <i className="fa fa-check" aria-hidden="true" />
            &nbsp;Mark all notifications as read
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  render() {
    const { newNotices } = this.state;
    const noticeNum = Object.keys(newNotices).length;
    let btnVariant = 'sidebar';
    let btnIcon = 'fa-bell-o';

    if (noticeNum > 0) {
      btnVariant = 'warning';
      btnIcon = 'fa-bell';
    }

    return (
      <>
        <SidebarButton
          label="Notifications"
          variant={btnVariant}
          icon={btnIcon}
          onClick={this.handleShow}
          isCollapsed={this.props.isCollapsed}
          showLabel={false}
        />
        {this.renderModal()}
      </>
    );
  }
}
