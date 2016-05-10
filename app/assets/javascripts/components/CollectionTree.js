import React from 'react';
import {Button} from 'react-bootstrap';

import CollectionStore from './stores/CollectionStore';
import CollectionActions from './actions/CollectionActions';

import CollectionSubtree from './CollectionSubtree';

import UIActions from './actions/UIActions';
import UIStore from './stores/UIStore';
import extra from './extra/CollectionTreeExtra';
import ElementStore from './stores/ElementStore';

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);
    this.state = CollectionStore.getState();
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange.bind(this));
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange.bind(this));
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

    return this.subtrees(roots, null, false);
  }

  sharedSubtrees() {
    let roots = this.state.sharedRoots;

    let sharedWithLabels = roots.map((root) => {
      return root.label;
    }).unique();

    let fakeRoots = sharedWithLabels.map((label) => {
      return {
        label: label,
        id: '',
        children: [],
        descendant_ids: []
      }
    });

    this.assignRootsAsChildrenToFakeRoots(roots, fakeRoots);

    fakeRoots.forEach((root) => {
      root.label = root.label.replace('project', 'projects');
    });

    return this.subtrees(fakeRoots, <div className="tree-view"><div className={"title "} style={{backgroundColor:'white'}}><i className="fa fa-list" /> My shared projects <i className="fa fa-share-alt" /></div></div>, false);
  }

  remoteSubtrees() {
    let roots = this.state.remoteRoots;

    // for unique see below (end of file)
    let sharedByNames = roots.map((root) => {
      return root.shared_by_name
    }).unique();

    let fakeRoots = sharedByNames.map((name) => {
      return {
        label: 'From ' + name,
        id: '',//'from-' + this.convertToSlug(name),
        children: [],
        descendant_ids: []
      }
    });

    this.assignRootsAsChildrenToFakeRoots(roots, fakeRoots);

    return this.subtrees(fakeRoots, <div className="tree-view"><div className={"title "} style={{backgroundColor:'white'}}><i className="fa fa-list" /> Shared with me <i className="fa fa-share-alt" /></div></div>, true)
  }

  convertToSlug(name) {
    return name.toLowerCase()
  }

  assignRootsAsChildrenToFakeRoots(roots, fakeRoots) {
    roots.forEach((root) => {
      let fakeRootForRoot = fakeRoots.filter((fakeRoot) => {
        return fakeRoot.label == `From ${root.shared_by_name}` || fakeRoot.label == root.label;
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
      if(currentCollection.label == 'All') {
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
    for (let j=0;j < extra.DivCount;j++){
      let NoName = extra["Div"+j];
      extraDiv.push(<NoName key={"collTreeExtraDiv"+j} />);
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
