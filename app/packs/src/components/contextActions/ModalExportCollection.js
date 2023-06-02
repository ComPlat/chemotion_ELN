import React from 'react';
import { Button, ButtonToolbar } from 'react-bootstrap';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

const gatherCheckboxes = (collections, checkboxes) => {
  if (Array.isArray(collections) && collections.length > 0) {
    collections.forEach((collection) => {
      checkboxes[collection.id] = false;
    });
  }
};

export default class ModalExportCollection extends React.Component {
  constructor(props) {
    super(props);

    const {
      myLockedCollectionTree, myCollectionTree, sharedCollectionTree
    } = CollectionStore.getState();

    const flattenLocked = CollectionStore.flattenCollectionTree(myLockedCollectionTree);
    const flattenCollectionTree = CollectionStore.flattenCollectionTree(myCollectionTree);
    const flattenSharedTree = CollectionStore.flattenCollectionTree(sharedCollectionTree)
      .filter((collection) => collection.canExport());

    const checkboxes = {};
    gatherCheckboxes(flattenLocked, checkboxes);
    gatherCheckboxes(flattenCollectionTree, checkboxes);
    gatherCheckboxes(flattenSharedTree, checkboxes);

    this.state = {
      processing: false,
      lockedCollections: flattenLocked,
      collections: flattenCollectionTree,
      sharedCollections: flattenSharedTree,
      checkboxes,
    };

    this.handleCheckAll = this.handleCheckAll.bind(this)
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  hasChecked() {
    const { checkboxes } = this.state;
    if (Object.keys(checkboxes).every(key => checkboxes[key] === false)) {
      // all checkboxes are unchecked
      return false
    } else {
      return true
    }
  }

  isChecked(id) {
    return this.state.checkboxes[id]
  }

  handleCheckAll() {
    const { checkboxes } = this.state;
    const hasChecked = this.hasChecked();

    Object.keys(checkboxes).forEach((key) => { checkboxes[key] = !hasChecked; });

    this.setState({ checkboxes });
  }

  handleCheckboxChange(e) {
    const { checkboxes } = this.state;
    checkboxes[e.target.value] = e.target.checked;
    this.setState({ checkboxes });
  }

  handleClick() {
    const { onHide, action } = this.props;
    this.setState({ processing: true });

    const collections = [];
    Object.keys(this.state.checkboxes).map((key) => {
      if (this.state.checkboxes[key]) { collections.push(key); }
    });

    const params = {
      collections,
      format: 'zip',
      nested: false
    };

    action(params);

    setTimeout(() => {
      this.setState({ processing: false });
      onHide();
    }, 1000);
  }

  renderCheckAll() {
    return (
      <div>
        <input type="checkbox" id="export-collection-check-all"
          checked={this.hasChecked()} onChange={this.handleCheckAll} className="common-checkbox" />
        <label className="g-marginLeft--10" htmlFor="export-collection-check-all">
          {this.hasChecked() ? "Deselect all" : "Select all"}
        </label>
      </div>
    )
  }

  renderCollections(label, key) {
    let collections = this.state[key]

    if (Array.isArray(collections) && collections.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {this.renderSubtrees(collections)}
        </div>
      )
    }
  }


  renderSubtrees(collections, withUserInfo = false) {
    if (Array.isArray(collections) && collections.length > 0) {
      const nodes = collections.map((collection, index) => {
        const indent = collection.depth > 0 ? (
          `${'\u00A0'.repeat(3 * collection.depth)}└─ `
        ) : '';
        const userInfo = (withUserInfo && collection.user?.name) ? ` from ${collection.user.name}` : '';
        return (
          <li key={`export-collection-${collection.id}`}>
            <input className="common-checkbox" type="checkbox"
              id={"export-collection-" + collection.id}
              value={collection.id}
              onChange={this.handleCheckboxChange}
              checked={this.isChecked(collection.id)} />
            <label className="g-marginLeft--10" htmlFor={"export-collection-" + collection.id}>
              {indent + collection.label + userInfo}
            </label>
          </li>
        )
      })

      return (
        <ul className="list-unstyled">
          {nodes}
        </ul>
      )
    }
  }

  renderButtonBar() {
    const { onHide } = this.props;
    const { processing } = this.state;
    const bStyle = processing === true ? 'danger' : 'warning';
    const bClass = processing === true ? 'fa fa-spinner fa-pulse fa-fw' : 'fa fa-file-text-o';
    const bTitle = processing === true ? 'Exporting' : 'Export ZIP';
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
            <Button
              bsStyle={bStyle}
              id="md-export-dropdown"
              disabled={this.isDisabled()}
              title="Export as ZIP file (incl. attachments)"
              onClick={this.handleClick}
            >
              <span><i className={bClass} />&nbsp;{bTitle}</span>
            </Button>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>
    );
  }

  isDisabled() {
    const { processing } = this.state;
    return processing === true;
  }

  render() {
    const onChange = (v) => this.setState(
      previousState => { return { ...previousState, value: v } }
    )
    const { full } = this.props;
    return (
      <div className="export-collections-modal">
        {this.renderCheckAll()}
        {this.renderCollections('My collections', 'lockedCollections')}
        {this.renderCollections('', 'collections')}
        {this.renderCollections('Shared with me', 'sharedCollections')}
        {this.renderButtonBar()}
      </div>
    )
  }
}
