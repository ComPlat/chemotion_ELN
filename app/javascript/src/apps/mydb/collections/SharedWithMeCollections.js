import React from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, OverlayTrigger, Popover } from 'react-bootstrap';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';

export default class SharedWithMeCollections extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tree: {
        children: []
      }
    }
    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.renderNode = this.renderNode.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange)
    CollectionActions.fetchRemoteCollectionRoots()
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange)
  }

  onStoreChange(state) {
    const children = state.remoteRoots;

    children.forEach((child) => {
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
    });

    this.setState({
      tree: {
        children,
      }
    });
  }

  handleClick() {
    this.setState({ show: !this.state.show });
  }

  renderNode(node) {
    if (node.is_locked) {
      return (
        <h5
          className="ms-3"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {node.label}
        </h5>
      );
    } else {
      const shouldRenderActions = typeof (node.shared_to) === 'undefined' || !node.shared_to
      const popover = (
        <Popover>
          <Popover.Body>
            <div>Delete collection?</div>
            <div>
              &quot;
              {node.label}
              &quot;
            </div>
            <div>
              <ButtonGroup>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => CollectionActions.rejectShared({ id: node.id })}
                >
                  Yes
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={this.handleClick}
                >
                  No
                </Button>
              </ButtonGroup>
            </div>
          </Popover.Body>
        </Popover>
      );

      return (
        <div className="d-flex align-items-center justify-content-between bg-dark-subtle mb-2">
          <div className="ms-3">
            {node.label}
          </div>
          {shouldRenderActions && (
            <ButtonGroup>
              <OverlayTrigger
                animation
                placement="bottom"
                root
                trigger="focus"
                overlay={popover}
              >
                <Button size="sm" variant="danger">
                  <i className="fa fa-trash-o" />
                </Button>
              </OverlayTrigger>
            </ButtonGroup>
          )}
        </div>
      );
    }
  }

  render() {
    const trees = () => this.state.tree.children.map((e, i) => {
      return (
        <Tree
          key={i}
          draggable={false}
          paddingLeft={20}
          tree={e}
          renderNode={this.renderNode}
        />
      )
    })

    return (
      <div>
        <h4>Collections shared with me</h4>
        {trees()}
      </div>
    )
  }
}
