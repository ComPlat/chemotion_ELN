/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ListGroup, ListGroupItem, Button
} from 'react-bootstrap';
import ContainerDatasetModal from 'src/components/container/ContainerDatasetModal';
import ContainerDatasetField from 'src/components/container/ContainerDatasetField';
import Container from 'src/models/Container';
import AttachmentDropzone from 'src/components/container/AttachmentDropzone';
import Well from 'src/components/legacyBootstrap/Well'

export default class ContainerDatasets extends Component {
  constructor(props) {
    super(props);
    const { container } = props;
    this.state = {
      container,
      modal: {
        show: false,
        datasetContainer: null,
      },
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.container !== prevProps.container) {
      this.setState({
        container: this.props.container,
      });
    }
  }

  handleModalOpen(datasetContainer) {
    const { modal } = this.state;
    modal.datasetContainer = datasetContainer || {};
    modal.show = true;
    this.setState({ modal });
  }

  handleAdd() {
    const { container } = this.state;
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    container.children.push(datasetContainer);

    this.handleModalOpen(datasetContainer);
    this.props.onChange(container);
  }

  handleAddWithAttachments(attachments) {
    const { container } = this.state;
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';

    attachments.forEach((attachment) => {
      datasetContainer.attachments.push(attachment);
    });
    container.children.push(datasetContainer);

    this.handleModalOpen(datasetContainer);
    this.props.onChange(container);
  }

  handleRemove(datasetContainer) {
    const { container } = this.state;

    datasetContainer.is_deleted = true;
    this.props.onChange(container);
  }

  handleUndo(datasetContainer) {
    const { container } = this.state;

    datasetContainer.is_deleted = false;
    this.props.onChange(container);
  }

  handleChange(datasetContainer) {
    const { container } = this.state;

    container.children.find((dataset) => {
      if (dataset.id === datasetContainer.id) {
        const datasetId = container.children.indexOf(dataset);
        container.children[datasetId] = datasetContainer;
      }
    });

    this.props.onChange(container);
  }

  handleModalHide() {
    const { modal } = this.state;
    modal.show = false;
    modal.datasetContainer = null;
    this.setState({ modal });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  addButton() {
    const { readOnly, disabled } = this.props;
    if (!readOnly && !disabled) {
      return (
        <div className="pull-right" style={{ marginTop: 5, marginBottom: 5 }}>
          <Button size="sm" variant="success" onClick={() => this.handleAdd()}>
            <i className="fa fa-plus" />
          </Button>
        </div>
      );
    }
    return null;
  }

  render() {
    const { container, modal } = this.state;
    const { disabled,readOnly } = this.props;

    if (container.children.length > 0) {
      const kind = container.extended_metadata && container.extended_metadata.kind;
      return (
        <div>
          <Well style={{ minHeight: 70, padding: 5, paddingBottom: 31 }}>
            <ListGroup style={{ marginBottom: 0 }}>
              {container.children.map((datasetContainer, key) => (
                <ListGroupItem key={key}>
                  <ContainerDatasetField
                    kind={kind}
                    datasetContainer={datasetContainer}
                    onChange={() => this.handleChange(datasetContainer)}
                    handleRemove={() => this.handleRemove(datasetContainer)}
                    handleUndo={() => this.handleUndo(datasetContainer)}
                    handleModalOpen={() => this.handleModalOpen(datasetContainer)}
                    disabled={disabled}
                    readOnly={readOnly}
                  />
                </ListGroupItem>
              ))}
              <ListGroupItem key="attachmentdropzone" disabled >
                <AttachmentDropzone
                  handleAddWithAttachments={(attachments) => this.handleAddWithAttachments(attachments)}
                />
              </ListGroupItem>
            </ListGroup>
            {this.addButton()}
          </Well>
          {modal.show && modal.datasetContainer && (
          <ContainerDatasetModal
            onHide={() => this.handleModalHide()}
            onChange={(datasetContainer) => this.handleChange(datasetContainer)}
            kind={kind}
            show={modal.show}
            readOnly={this.props.readOnly}
            datasetContainer={modal.datasetContainer}
            analysisContainer={modal.analysisContainer}
            disabled={disabled}
          />
          )}
        </div>
      );
    }
    return (
      <div>
        <Well style={{ minHeight: 70, padding: 5, paddingBottom: 31 }}>
          <p>There are currently no Datasets.</p>
          <ListGroup style={{ marginBottom: 0 }}>
            <ListGroupItem key="attachmentdropzone" disabled>
              <AttachmentDropzone
                handleAddWithAttachments={(attachments) => this.handleAddWithAttachments(attachments)}
              />
            </ListGroupItem>
          </ListGroup>
          {this.addButton()}
        </Well>
      </div>
    );
  }
}

ContainerDatasets.propTypes = {
  container: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
};

ContainerDatasets.defaultProps = {
  readOnly: false,
  disabled: false,
};
