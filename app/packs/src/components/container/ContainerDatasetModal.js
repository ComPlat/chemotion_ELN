import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, ButtonToolbar, Button } from 'react-bootstrap';
import ContainerDataset from 'src/components/container/ContainerDataset';

export default class ContainerDatasetModal extends Component {
  constructor(props) {
    super(props);

    this.datasetInput = React.createRef();
    this.handleSave = this.handleSave.bind(this);
  }

  handleSave() {
    this.datasetInput.current.handleSave();
  }

  render() {
    const {
      show, datasetContainer, onHide, onChange, readOnly, disabled, kind
    } = this.props;
    if (show) {
      return (
        <Modal
          show={show}
          backdrop="static"
          bsSize="large"
          dialogClassName="attachment-dataset-modal"
          onHide={() => (disabled ? onHide() : this.handleSave())}
        >
          <Modal.Header>
            <Modal.Title>
              {datasetContainer.name}
              <ButtonToolbar>
                <Button bsStyle="light" onClick={() => (disabled ? onHide() : this.handleSave())}>
                  <i className="fa fa-times" />
                </Button>
              </ButtonToolbar>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ContainerDataset
              ref={this.datasetInput}
              readOnly={readOnly}
              datasetContainer={datasetContainer}
              kind={kind}
              onModalHide={() => onHide()}
              onChange={onChange}
            />
          </Modal.Body>
        </Modal>
      );
    }
    return <div />;
  }
}

ContainerDatasetModal.propTypes = {
  show: PropTypes.bool.isRequired,
  datasetContainer: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  onHide: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string.isRequired,
};

ContainerDatasetModal.defaultProps = {
  readOnly: false,
  disabled: false,
};
