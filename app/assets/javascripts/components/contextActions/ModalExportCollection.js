import React from 'react';
import {Button, ButtonToolbar} from 'react-bootstrap';
import UIStore from './../stores/UIStore';
import CollectionStore from './../stores/CollectionStore';

export default class ModalExportCollection extends React.Component {
  constructor(props) {
    super(props);

    let collecState = CollectionStore.getState()

    let checkboxes = {}
    this.gatherCheckboxes(collecState.unsharedRoots, checkboxes)
    this.gatherCheckboxes(collecState.sharedRoots, checkboxes)
    this.gatherCheckboxes(collecState.remoteRoots, checkboxes)
    this.gatherCheckboxes(collecState.lockedRoots, checkboxes)

    this.state = {
      processing: false,
      unsharedRoots: collecState.unsharedRoots,
      sharedRoots: collecState.sharedRoots,
      remoteRoots: collecState.remoteRoots,
      lockedRoots: collecState.lockedRoots,
      checkboxes: checkboxes
    }

    this.handleCheckAll = this.handleCheckAll.bind(this)
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  gatherCheckboxes(roots, checkboxes) {
    if (Array.isArray(roots) && roots.length > 0) {
      roots.map((root, index) => {
        checkboxes[root.id] = false;
        this.gatherCheckboxes(root.children, checkboxes)
      })
    }
  }

  hasChecked() {
    let checkboxes = this.state.checkboxes
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
          {this.hasChecked() ? "Deselect all" : "Select all" }
        </label>
      </div>
    )
  }

  renderCollections(label, key) {
    let roots = this.state[key]

    if (Array.isArray(roots) && roots.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {this.renderSubtrees(roots)}
        </div>
      )
    }
  }

  renderSharedCollections(label, key) {
    let roots = this.state[key]

    if (Array.isArray(roots) && roots.length > 0) {
      return (
        <div>
          <h4>{label}</h4>
          {this.renderUserSubtrees(roots)}
        </div>
      )
    }
  }

  renderUserSubtrees(roots) {
    if (Array.isArray(roots) && roots.length > 0) {

      let nodes = roots.map((root, index) => {

        let label
        if (root.shared_by) {
          label = 'by ' + root.shared_by.initials
        } else if (root.shared_to) {
          label = 'with ' + root.shared_to.initials
        } else {
          label = root.label
        }

        return (
          <li key={index}>
            <h6>{label}</h6>
            {this.renderSubtrees(root.children)}
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

  renderSubtrees(roots) {
    if (Array.isArray(roots) && roots.length > 0) {
      let nodes = roots.map((root, index) => {
        return (
          <li key={index}>
            <input className="common-checkbox" type="checkbox"
                   id={"export-collection-" + root.id}
                   value={root.id}
                   onChange={this.handleCheckboxChange}
                   checked={this.isChecked(root.id)} />
            <label className="g-marginLeft--10" htmlFor={"export-collection-" + root.id}>
              { root.label }
            </label>

            {this.renderSubtrees(root.children)}
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
              <span><i className={bClass} />{bTitle}</span>
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
      previousState => {return { ...previousState, value: v }}
    )
    const { full } = this.props;
    return (
      <div className="export-collections-modal">
        {this.renderCollections('Global collections', 'lockedRoots')}
        {this.renderCollections('My collections', 'unsharedRoots')}
        {this.renderSharedCollections('My shared collections', 'sharedRoots')}
        {this.renderSharedCollections('Shared with me', 'remoteRoots')}
        {this.renderCheckAll()}
        {this.renderButtonBar()}
      </div>
    )
  }
}
