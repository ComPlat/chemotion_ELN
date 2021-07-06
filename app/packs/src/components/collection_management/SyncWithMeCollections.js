import React from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, FormControl, OverlayTrigger, Popover } from 'react-bootstrap';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';

export default class SyncWithMeCollections extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tree: {
        label: 'Synchronized with me Collections',
        id: -1,
        children: [{}],
      }
    }
    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange)
    CollectionActions.fetchSyncInCollectionRoots()
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange)
  }

  onStoreChange(state) {
    const children = state.syncInRoots.length > 0 ? state.syncInRoots : [{}];
    children.map((child) => {
      if (child.is_locked) {
        let label = '';
        if (child.shared_by != null) {
          label = `by ${child.shared_by.initials} (${child.shared_by.name})`;
        }
        if (child.shared_to != null) {
          label += ` with ${child.shared_to.initials} (${child.shared_to.name})`;
        }
        child.label = label;
      }
      return child;
    });

    this.setState({
      tree: {
        label: 'Synchronized with me Collections',
        children
      }
    });
  }

  handleClick() {
    this.setState({ show: !this.state.show });
  }

  label(node) {
    if (node.root) {
      return (
        <div className="root-label">
          Synchronized with me Collections
        </div>
      )
    }
    return (
      <FormControl
        className="collection-label"
        type="text"
        disabled
        value={node.label || ''}
      />
    )
  }

  actions(node) {
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        delete collection: <br /> {node.label} ?<br />
        <ButtonGroup>
          <Button bsStyle="danger" bsSize="xsmall" onClick={() => CollectionActions.rejectSync({ id: node.id, is_syncd: true })}>
          Yes
          </Button>
          <Button bsStyle="warning" bsSize="xsmall" onClick={this.handleClick} >
          No
          </Button>
        </ButtonGroup>
      </Popover>
    );
    if (!node.is_locked && node.label !== 'Synchronized with me Collections') {
      if (typeof (node.user) !== 'undefined' && node.user.type === 'Person') {
        return (
          <ButtonGroup className="actions">
            <OverlayTrigger
              animation
              placement="bottom"
              onExit={document.body.click()}
              root
              trigger="focus"
              overlay={popover}
            >
              <Button bsSize="xsmall" bsStyle="danger" >
                <i className="fa fa-trash-o" />
              </Button>
            </OverlayTrigger>
          </ButtonGroup>
        )
      }
    }
    return (
      <div />
    )
  }

  renderNode(node) {
    if (!Object.keys(node).length == 0) {
      return (
        <span className="node">
          {this.label(node)}
          {this.actions(node)}
        </span>
      );
    }
    return (
      <div />
    )
  }

  render() {
    const trees = () => this.state.tree.children.map((e, i) => {
      return (
        <Tree
          key={i}
          draggable={false}
          paddingLeft={20}
          tree={e}
          renderNode={this.renderNode.bind(this)}
        />
      )
    })

    return (
      <div className="tree">
        <Tree
          draggable={false}
          paddingLeft={20}
          tree={{
            label: 'Synchronized with me Collections',
            root: true,
            id: -1,
            path: -1
          }}
          renderNode={this.renderNode.bind(this)}
        />
        {trees()}
      </div>
    )
  }
}
