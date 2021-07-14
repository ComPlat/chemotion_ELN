import React from 'react';
import { Button, OverlayTrigger, Badge, Glyphicon, Tooltip } from 'react-bootstrap';
import update from 'immutability-helper';
import CollectionStore from './stores/CollectionStore';
import CollectionActions from './actions/CollectionActions';
import CollectionSubtree from './CollectionSubtree';
import UIActions from './actions/UIActions';
import InboxActions from './actions/InboxActions';
import LoadingActions from './actions/LoadingActions';
import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import InboxStore from './stores/InboxStore';
import Xdiv from './extra/CollectionTreeXdiv';
import UserInfos from './UserInfos';

import DeviceBox from './inbox/DeviceBox';
import UnsortedBox from './inbox/UnsortedBox';

const colVisibleTooltip = <Tooltip id="col_visible_tooltip">Toggle own collections</Tooltip>;

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);

    const collecState = CollectionStore.getState();
    const inboxState = InboxStore.getState();

    this.state = {
      unsharedRoots: collecState.unsharedRoots,
      sharedRoots: collecState.sharedRoots,
      remoteRoots: collecState.remoteRoots,
      lockedRoots: collecState.lockedRoots,
      syncInRoots: collecState.syncInRoots,
      ownCollectionVisible: true,
      sharedWithCollectionVisible: false,
      sharedToCollectionVisible: false,
      syncCollectionVisible: false,
      inbox: inboxState.inbox,
      numberOfAttachments: inboxState.numberOfAttachments,
      inboxVisible: false
    };

    this.onChange = this.onChange.bind(this);
    this.onClickInbox = this.onClickInbox.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange);
    InboxStore.listen(this.onChange);
    //CollectionActions.fetchGenericEls();
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();
    InboxActions.fetchInboxCount();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange);
    InboxStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(state);
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

  removeOrphanRoots(roots) {
    let newRoots =[]
    roots.forEach((root) => {
      if (root.children.length > 0) newRoots.push(root)
    })

    return newRoots;
  }

  unsharedSubtrees() {
    let roots = this.state.unsharedRoots;
    roots = roots.filter(function(item) { return !item.isNew})

    return this.subtrees(roots, null, false);
  }

  sharedSubtrees() {
    let {sharedRoots, sharedToCollectionVisible} = this.state
    sharedRoots = this.removeOrphanRoots(sharedRoots)

    let labelledRoots = sharedRoots.map(e => {
      return update(e, {label: {$set:
        <span>{this.labelRoot('shared_to', e)}</span>
      }})
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div className="title" style={{backgroundColor:'white'}}
             onClick={() => this.setState({sharedToCollectionVisible: !sharedToCollectionVisible})}>
          <i className="fa fa-share-alt share-icon" />&nbsp;&nbsp;
          My shared collections
        </div>
      </div>
    )
    return this.subtrees(labelledRoots, subTreeLabels,
                         false, sharedToCollectionVisible)
  }

  remoteSubtrees() {
    let {remoteRoots, sharedWithCollectionVisible} = this.state
    remoteRoots = this.removeOrphanRoots(remoteRoots)

    let labelledRoots = remoteRoots.map(e => {
      return update(e, {label: {$set:
        <span>
          {this.labelRoot('shared_by',e)}
          {' '}
          {this.labelRoot('shared_to',e)}
        </span>
      }})
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div id="shared-home-link" className="title" style={{backgroundColor:'white'}}
             onClick={() => this.setState({sharedWithCollectionVisible: !sharedWithCollectionVisible})}>
          <i className="fa fa-share-alt share-icon"/>
          &nbsp;&nbsp;
          Shared with me &nbsp;
        </div>
      </div>
    )

    return this.subtrees(labelledRoots, subTreeLabels,
                         false, sharedWithCollectionVisible)
  }


  inboxSubtrees() {
    const { inbox } = this.state;

    let boxes = '';
    if (inbox.children) {
      inbox.children.sort((a, b) => {
        if (a.name > b.name) { return 1; } if (a.name < b.name) { return -1; } return 0;
      });
      boxes = inbox.children.map((deviceBox) => {
        return (
          <DeviceBox key={`box_${deviceBox.id}`} device_box={deviceBox} />
        );
      });
    }

    return (
      <div className="tree-view">
        {boxes}
        {inbox.unlinked_attachments
          ? <UnsortedBox key="unsorted_box" unsorted_box={inbox.unlinked_attachments} />
          : ''
        }
      </div>
    );
  }

  remoteSyncInSubtrees() {
    let {syncInRoots, syncCollectionVisible} = this.state
    syncInRoots = this.removeOrphanRoots(syncInRoots)

    let labelledRoots = syncInRoots.map(e => {
      return update(e, {label: {$set:
        <span>
          {this.labelRoot('shared_by', e)}
          {' '}
          {this.labelRoot('shared_to', e)}
        </span>
      }})
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div id="synchron-home-link" className="title" style={{backgroundColor:'white'}}
             onClick={() => this.setState({syncCollectionVisible: !syncCollectionVisible})}>
          <i className="fa fa-share-alt"/>&nbsp;&nbsp;
          Synchronized with me &nbsp;
        </div>
      </div>
    )

    return this.subtrees(labelledRoots, subTreeLabels,
                         false, syncCollectionVisible)
  }


  labelRoot(sharedToOrBy, rootCollection) {
    let shared = rootCollection[sharedToOrBy]
    if (!shared) return <span />

    return(
      <OverlayTrigger placement="bottom" overlay={UserInfos({users:[shared]})}>
        <span>
          &nbsp; {sharedToOrBy == 'shared_to' ? 'with' : 'by'}
          &nbsp; {shared.initials}
        </span>
      </OverlayTrigger>
    )
  }

  convertToSlug(name) {
    return name.toLowerCase()
  }

  subtrees(roots, label, isRemote, visible = true) {
    let subtrees = roots.map((root, index) => {
      return <CollectionSubtree root={root} key={index} isRemote={isRemote}/>
    })

    let subtreesVisible = visible ? "" : "none"
    return (
      <div>
        {label}
        <div style={{display: subtreesVisible}}>
          {subtrees}
        </div>
      </div>
    )
  }

  collectionManagementButton() {
    return (
      <div className="take-ownership-btn">
        <Button id="col-mgnt-btn" bsSize="xsmall" bsStyle="danger"
                onClick={() => this.handleCollectionManagementToggle()}>
          <i className="fa fa-cog"></i>
        </Button>
      </div>
    )
  }

  handleCollectionManagementToggle() {
    UIActions.toggleCollectionManagement();
    const {showCollectionManagement, currentCollection,isSync} = UIStore.getState();
    if(showCollectionManagement) {
      Aviator.navigate('/collection/management');
    } else {
      if( currentCollection == null || currentCollection.label == 'All' ) {
        Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`);
      } else {
        Aviator.navigate(isSync
          ? `/scollection/${currentCollection.id}/${this.urlForCurrentElement()}`
          : `/collection/${currentCollection.id}/${this.urlForCurrentElement()}`);
      }
    }
  }

  urlForCurrentElement() {
    const {currentElement} = ElementStore.getState();
    if(currentElement) {
      if(currentElement.isNew) {
        return `${currentElement.type}/new`;
      }
      else{
        return `${currentElement.type}/${currentElement.id}`;
      }
    }
    else {
      return '';
    }
  }

  render() {
    let {ownCollectionVisible, inboxVisible, inbox} = this.state
    let extraDiv = [];
    for (let j=0;j < Xdiv.count;j++){
      let NoName = Xdiv["content"+j];
      extraDiv.push(<NoName key={"Xdiv"+j} />);
    }

    const ownCollectionDisplay = ownCollectionVisible ? '' : 'none';
    const inboxDisplay = inboxVisible ? '' : 'none';

    return (
      <div>
        <div className="tree-view">
          {this.collectionManagementButton()}
          <OverlayTrigger placement="top" delayShow={1000} overlay={colVisibleTooltip}>
            <div className="title" style={{backgroundColor:'white'}}
                 onClick={() => this.setState({ownCollectionVisible: !ownCollectionVisible})}>
              <i className="fa fa-list" /> &nbsp;&nbsp; Collections
            </div>
          </OverlayTrigger>
        </div>
        <div className="tree-wrapper" style={{ display: ownCollectionDisplay }}>
          {this.lockedSubtrees()}
          {this.unsharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.sharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSyncInSubtrees()}
        </div>
        {extraDiv.map((e)=>{return e})}
        <div className="tree-view">
          <div className="title" style={{ backgroundColor: 'white' }}>
            <i className="fa fa-inbox" onClick={() => this.onClickInbox()}> &nbsp; Inbox &nbsp;</i>
            {
              this.state.numberOfAttachments > 0 ? <Badge> {this.state.numberOfAttachments} </Badge> : ''
            }
            &nbsp;<Glyphicon bsSize="small" glyph="refresh" onClick={() => this.refreshInbox()} />
            <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullInbox">Show larger Inbox</Tooltip>}>
              <Button style={{ position: 'absolute', right: 0 }} bsSize="xsmall" onClick={InboxActions.toggleInboxModal}>
                <i className="fa fa-expand" aria-hidden="true" />
              </Button>
            </OverlayTrigger>

          </div>

        </div>
        <div className="tree-wrapper" style={{ display: inboxDisplay }}>
          { this.inboxSubtrees() }
        </div>
      </div>
    )
  }
}
