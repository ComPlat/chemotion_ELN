import React from 'react';
import {Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import CollectionStore from './stores/CollectionStore';
import CollectionActions from './actions/CollectionActions';
import CollectionSubtree from './CollectionSubtree';
import UIActions from './actions/UIActions';
import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import Xdiv from './extra/CollectionTreeXdiv';
import update from 'react-addons-update';

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);
    this.state = CollectionStore.getState();
    this.onChange = this.onChange.bind(this)
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange);
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState(state);
  }

  lockedSubtrees() {
    const roots = this.state.lockedRoots;

    return this.subtrees(roots, null, false);
  }

  unsharedSubtrees() {
    let roots = this.state.unsharedRoots;
    roots = roots.filter(function(item) { return !item.isNew})

    return this.subtrees(roots, null, false);
  }

  sharedSubtrees() {
    let labelledRoots = this.state.sharedRoots.map(e=>{
      return  update(e,{label: {$set: <span>{this.labelRoot('shared_to',e)}</span>}})
    });
    return this.subtrees(labelledRoots, <div className="tree-view"><div className={"title "} style={{backgroundColor:'white'}}><i className="fa fa-list" /> My shared projects <i className="fa fa-share-alt" /></div></div>, false);
  }

  remoteSubtrees() {
    let labelledRoots = this.state.remoteRoots.map(e=>{
      return  update(e,{label: {$set: <span>
        {this.labelRoot('shared_by',e)}
        {' '}
        {this.labelRoot('shared_to',e)}
        </span>
      }})
    });
    return this.subtrees(labelledRoots, <div className="tree-view"><div
      className={"title"} style={{backgroundColor:'white'}}>
      <i className="fa fa-list"/> Shared with me <i className="fa fa-share-alt"/>
      </div></div>, false)
  }



  labelRoot(sharedToOrBy,rootCollection){
    let shared = rootCollection[sharedToOrBy]
    if (shared){
      return(
        <OverlayTrigger placement="bottom" overlay={this.userInfo(shared)}>
          <span>{sharedToOrBy=='shared_to'?'with':'by'} {shared.initials}</span>
        </OverlayTrigger>
      )
    } else{
      return(
        <span></span>
      )
    }
  }

  userInfo(user){
    let iconClass =  "fa fa-user"
    switch(user.type) {
      case 'Person':
          iconClass = "fa fa-user"
          break;
      case 'Group':
          iconClass = "fa fa-users"
          break;
      default:
        iconClass =  "fa fa-user"
    }
    return(
      <Tooltip id="tooltip">
        <i className={iconClass} aria-hidden="true"/>{user.name}
      </Tooltip>
    )
  }

  convertToSlug(name) {
    return name.toLowerCase()
  }

  assignRootsAsChildrenToFakeRoots(roots, fakeRoots) {
    roots.forEach((root) => {
      let fakeRootForRoot = fakeRoots.filter((fakeRoot) => {
        return fakeRoot.label == `From ${root.shared_by.name}` || fakeRoot.label == root.label;
      })[0];

      fakeRootForRoot.children.push(root);
      fakeRootForRoot.descendant_ids.push(root.id);
    })
  }

  subtrees(roots, label, isRemote) {
    if(roots.length > 0) {
      let subtrees = roots.map((root, index) => {
        return <CollectionSubtree key={index} root={root} isRemote={isRemote}/>
      });

      return (
        <div>
          {label}
          {subtrees}
        </div>
      )
    } else {
      return <div></div>;
    }
  }

  collectionManagementButton() {
    return  (
      <div className="take-ownership-btn">
        <Button bsStyle="danger" bsSize="xsmall" onClick={() => this.handleCollectionManagementToggle()}>
          <i className="fa fa-cog"></i>
        </Button>
      </div>
    )
  }

  handleCollectionManagementToggle() {
    UIActions.toggleCollectionManagement();
    const {showCollectionManagement, currentCollection} = UIStore.getState();
    if(showCollectionManagement) {
      Aviator.navigate('/collection/management');
    } else {
      if( currentCollection == null || currentCollection.label == 'All' ) {
        Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`);
      } else {
        Aviator.navigate(`/collection/${currentCollection.id}/${this.urlForCurrentElement()}`);
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
    let extraDiv = [];
    for (let j=0;j < Xdiv.divCount;j++){
      let NoName = Xdiv["div"+j];
      extraDiv.push(<NoName key={"Xdiv"+j} />);
    }
    return (
      <div>
        <div className="tree-view">{this.collectionManagementButton()}<div className={"title "} style={{backgroundColor:'white'}}><i className="fa fa-list" /> Collections </div></div>
        <div className="tree-wrapper">
          {this.lockedSubtrees()}
          {this.unsharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.sharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSubtrees()}
        </div>
        {extraDiv.map((e)=>{return e;})}
      </div>
    )
  }
}

Array.prototype.unique = function(a){
    return function(){ return this.filter(a) }
}(function(a,b,c){ return c.indexOf(a,b+1) < 0 });
