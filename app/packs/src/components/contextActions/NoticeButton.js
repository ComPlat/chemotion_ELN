import React from 'react';
import { PanelGroup, Panel, Button, Modal, Table } from 'react-bootstrap';
import 'whatwg-fetch';
import _ from 'lodash';

import MessagesFetcher from '../fetchers/MessagesFetcher';
import CollectionActions from '../actions/CollectionActions';
import NotificationActions from '../actions/NotificationActions';
import InboxActions from '../actions/InboxActions';
import ReportActions from '../actions/ReportActions';
import ElementActions from '../actions/ElementActions';

const handleNotification = (nots, act, needCallback = true) => {
  nots.forEach((n) => {
    if (act === 'rem') {
      NotificationActions.removeByUid(n.id);
    }
    if (act === 'add') {
      const newText = n.content.data.split('\n').map(i => <p key={`${new Date().getTime() + i}`}>{i}</p>);
      const notification = {
        title: `From ${n.sender_name} on ${n.updated_at}`,
        message: newText,
        level: n.content.level || 'warning',
        dismissible: 'button',
        autoDismiss: n.content.autoDismiss || 5,
        position: n.content.position || 'tr',
        uid: n.id,
        action: {
          label: <span><i className="fa fa-check" aria-hidden="true" />&nbsp;&nbsp;Got it</span>,
          callback() {
            if (needCallback) {
              const params = { ids: [] };
              params.ids[0] = n.id;
              MessagesFetcher.acknowledgedMessage(params);
              // .then((result) => { console.log(JSON.stringify(result)); });
            }
          }
        }
      };
      NotificationActions.add(notification);

      switch (n.content.action) {
        case 'CollectionActions.fetchRemoteCollectionRoots':
          CollectionActions.fetchRemoteCollectionRoots();
          break;
        case 'CollectionActions.fetchSyncInCollectionRoots':
          CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'InboxActions.fetchInbox':
          InboxActions.fetchInbox();
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
          ElementActions.fetchResearchPlanById(parseInt(n.content.research_plan_id, 10));
          break;
        default:
          //
      }
    }
  });
};

const createUpgradeNotification = (serverVersion, localVersion) => {
  const content = ['Dear ELNer,', 'A new version has been released. Please reload this page to enjoy the latest updates.',
    'Thank you and have a nice day  :)',
    '--------------------------',
    `Your version: ${localVersion}`, `Current version: ${serverVersion}`
  ].join('\n');
  const contentJson = { data: content };
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  const infoTimeString = new Date().toLocaleDateString('de-DE', options);
  const not = {
    id: -1,
    sender_name: 'System Adminstrator',
    updated_at: `${infoTimeString}`,
    content: contentJson
  };
  handleNotification([not], 'add', false);
};

const reviewUrl = (url, urlTitle) => (url ? <a href={url} target="_blank" rel="noopener noreferrer">{urlTitle || url}</a> : <span />);

export default class NoticeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      dbNotices: [],
      messageEnable: true,
      messageAutoInterval: 6000,
      lastActivityTime: new Date(),
      idleTimeout: 12,
      serverVersion: '',
      localVersion: '',
    };
    this.envConfiguration = this.envConfiguration.bind(this);
    this.handleShow = this.handleShow.bind(this);
    this.handleHide = this.handleHide.bind(this);
    this.messageAck = this.messageAck.bind(this);
    this.detectActivity = this.detectActivity.bind(this);
  }

  componentDidMount() {
    this.envConfiguration();
  }

  shouldComponentUpdate(nextProps, nextState) {
    const nots = this.state.dbNotices;
    const nextNots = nextState.dbNotices;

    const notIds = _.map(nots, 'id');
    const nextNotIds = _.map(nextNots, 'id');
    const newMessages = _.filter(nextNots, o => !_.includes(notIds, o.id));
    const remMessages = _.filter(nots, o => !_.includes(nextNotIds, o.id));

    if (Object.keys(newMessages).length > 0) {
      handleNotification(newMessages, 'add');
    }
    if (Object.keys(remMessages).length > 0) {
      handleNotification(remMessages, 'rem');
    }
    if (nextState.serverVersion && nextState.localVersion
      && nextState.serverVersion !== this.state.serverVersion
      && nextState.serverVersion !== nextState.localVersion) {
      const serverVer = nextState.serverVersion.substring(nextState.serverVersion.indexOf('-') + 1, nextState.serverVersion.indexOf('.js'));
      const localVer = nextState.localVersion.substring(nextState.localVersion.indexOf('-') + 1, nextState.localVersion.indexOf('.js'));
      if (serverVer !== localVer) {
        createUpgradeNotification(serverVer, localVer);
      }
    }

    return true;
  }

  componentWillUnmount() {
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
    const applicationTag = _.filter(document.scripts, s => s.src.indexOf(documentIndex) > -1);
    const applicationTagValue = applicationTag[0].src.substr(applicationTag[0].src
      .indexOf(documentIndex));

    MessagesFetcher.configuration()
      .then((result) => {
        this.setState({
          messageEnable: result.messageEnable === 'true',
          messageAutoInterval: result.messageAutoInterval,
          idleTimeout: result.idleTimeout,
          localVersion: applicationTagValue
        });
        const { messageEnable, messageAutoInterval } = this.state;

        if (messageEnable === true) {
          this.interval = setInterval(() => this.messageFetch(), messageAutoInterval);
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

  handleShow() {
    MessagesFetcher.fetchMessages(0)
      .then((result) => {
        result.messages.sort((a, b) => (a.id - b.id));
        this.setState({ showModal: true, dbNotices: result.messages });
      });
  }

  handleHide() {
    this.setState({ showModal: false });
  }

  messageAck(idx, ackAll) {
    let { dbNotices } = this.state;
    const params = {
      ids: [],
    };
    if (ackAll) {
      params.ids = _.map(dbNotices, 'id');
    } else {
      params.ids[0] = idx;
    }
    MessagesFetcher.acknowledgedMessage(params)
      .then((result) => {
        const ackIds = _.map(result.ack, 'id');
        dbNotices = _.filter(this.state.dbNotices, o => !_.includes(ackIds, o.id));
        dbNotices.sort((a, b) => (a.id - b.id));
        this.setState({
          dbNotices
        });
      });
  }

  messageFetch() {
    const { lastActivityTime, idleTimeout } = this.state;
    const clientLastActivityTime = new Date(lastActivityTime).getTime();
    const currentTime = new Date().getTime();
    const remainTime = Math.floor((currentTime - clientLastActivityTime) / 1000);
    if (remainTime < idleTimeout) {
      MessagesFetcher.fetchMessages(0)
        .then((result) => {
          result.messages.sort((a, b) => (a.id - b.id));
          this.setState({ dbNotices: result.messages, serverVersion: result.version });
        });
    }
  }

  renderBody() {
    const { dbNotices } = this.state;

    let bMessages = (
      <Panel
        id="panel-modal-body-allread"
        key="panel-modal-body-allread"
        eventKey="0"
        collapsible="true"
        defaultExpanded
        style={{ border: '0px' }}
      >
        <Table>
          <tbody>
            <tr>
              <td style={{ border: '0px', width: '100vw', textAlign: 'center' }}>
                All messages are read
              </td>
            </tr>
          </tbody>
        </Table>
      </Panel>
    );

    if (Object.keys(dbNotices).length > 0) {
      bMessages = dbNotices.map((not, index) => (
        <Panel
          key={`panel-modal-body-${not.id}`}
          eventKey={index}
          collapsible="true"
          defaultExpanded
          ref={(pl) => {
            this[`myPl${index}`] = pl;
          }}
        >
          <Panel.Heading>
            <i className="fa fa-commenting-o" aria-hidden="true" />&nbsp;{not.subject}&nbsp;&nbsp;
            <span><strong>From: </strong>{not.sender_name}</span>&nbsp;&nbsp;
            <span><strong>Created On: </strong>{not.created_at}</span>
          </Panel.Heading>
          <Panel.Body>
            <Table>
              <tbody>
                <tr>
                  <td width="10%">
                    <Button
                      id={`notice-button-ack-${not.id}`}
                      key={`notice-button-ack-${not.id}`}
                      onClick={() => this.messageAck(not.id, false)}
                    >
                      <i className="fa fa-check" aria-hidden="true" />&nbsp;Got it
                    </Button>
                  </td>
                  <td width="90%">
                    { not.content.data }
                    <br />
                    {reviewUrl(not.content.url, not.content.url_title)}
                  </td>
                </tr>
              </tbody>
            </Table>
          </Panel.Body>
        </Panel>
      ));
    }

    return (
      <PanelGroup
        id="panel-group-modal-body"
      >
        { bMessages }
      </PanelGroup>
    );
  }

  renderModal() {
    if (this.state.showModal) {
      return (
        <Modal show={this.state.showModal} onHide={this.handleHide} dialogClassName="noticeModal">
          <Modal.Header closeButton>
            <Modal.Title>Unread Messages</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            {this.renderBody()}
          </Modal.Body>
          <Modal.Footer>
            <Button id="notice-button-ack-all" key="notice-button-ack-all" onClick={() => this.messageAck(0, true)}><i className="fa fa-check" aria-hidden="true" />&nbsp;Mark as <strong>all read</strong></Button>
          </Modal.Footer>
        </Modal>
      );
    }
    return (<div />);
  }

  render() {
    const noticeNum = Object.keys(this.state.dbNotices).length;
    let btnStyle = 'warning';
    let btnClass = 'fa fa-commenting-o fa-lg';

    if (noticeNum <= 0) {
      btnStyle = 'default';
      btnClass = 'fa fa-comment-o fa-lg';
    }

    return (
      <div>
        {
          noticeNum <= 0 ? <span className="badge badge-pill">{noticeNum}</span> :
          <Button
            id="notice-button"
            bsStyle={btnStyle}
            onClick={this.handleShow}
            style={{ height: '34px', width: '36px' }}
          >
            <i className={btnClass} />&nbsp;
            <span className="badge badge-pill" style={{ top: '6px', left: '-10px', fontSize: '8px' }}>{noticeNum}</span>
          </Button>
        }
        {this.renderModal()}
      </div>
    );
  }
}
