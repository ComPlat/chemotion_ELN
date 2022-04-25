import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ControlLabel,
  FormControl, FormGroup, Modal
} from 'react-bootstrap';

import TreeSelect from 'antd/lib/tree-select';

export default class ImportModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      newLabel: null,
      options: [],
      selected: null,
    };

    this.onChange = this.onChange.bind(this);
    this.onSelectChange = this.onSelectChange.bind(this);
    this.handleImport = this.handleImport.bind(this);
  }

  componentDidMount() {
    this.props.fetchCollections().then((res) => {
      this.setState({ options: res.all_as_tree });
    });
  }

  onSelectChange(id) {
    this.setState({ selected: id });
  }

  onChange(e) {
    if (!e.target) return;

    this.setState({ newLabel: e.target.value });
  }

  handleImport() {
    const { selectedItems, closeModal, importData } = this.props;
    const { selected, newLabel } = this.state;

    closeModal();

    const data = selectedItems.map(item => ({ id: item.id, type: item.type }));
    const collection = { id: selected, newCollection: newLabel };
    importData(data, collection);
  }

  render() {
    const { show, selectedItems, closeModal } = this.props;

    const showModal = show && selectedItems.length > 0;

    const { options, newLabel, selected } = this.state;

    const btnText = newLabel ? (
      `Create collection "${newLabel}" and Import`
    ) : (
      'Import'
    );

    return (
      <Modal show={showModal}>
        <Modal.Header>
          <Modal.Title>Import to Collection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormGroup>
            <ControlLabel>Select a Collection</ControlLabel>
            <TreeSelect
              treeData={options}
              value={selected}
              onChange={this.onSelectChange}
              style={{ width: '100%' }}
            />
          </FormGroup>
          <FormGroup>
            <ControlLabel>or Create a new Collection</ControlLabel>
            <FormControl
              type="text"
              placeholder="-- Please insert collection name --"
              onChange={this.onChange}
            />
          </FormGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={closeModal}>Close</Button>
          <Button
            bsStyle="warning"
            style={{ float: 'left' }}
            onClick={this.handleImport}
            disabled={!(newLabel || selected)}
          >
            {btnText}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

ImportModal.propTypes = {
  show: PropTypes.bool,
  selectedItems: PropTypes.arrayOf(PropTypes.object),
  fetchCollections: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  importData: PropTypes.func.isRequired,
};

ImportModal.defaultProps = {
  show: false,
  selectedItems: []
};
