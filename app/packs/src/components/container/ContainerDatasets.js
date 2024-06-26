/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ListGroup, ListGroupItem, Button, Well
} from 'react-bootstrap';
import ContainerDatasetModal from 'src/components/container/ContainerDatasetModal';
import ContainerDatasetField from 'src/components/container/ContainerDatasetField';
import Container from 'src/models/Container';
import AttachmentDropzone from 'src/components/container/AttachmentDropzone';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

export default class ContainerDatasets extends Component {
  constructor(props) {
    super(props);

    this.initState = this.initState.bind(this);
    this.handleSavingModal = this.handleSavingModal.bind(this);
    this.initState(props);
  }

  componentDidUpdate(prevProps) {
    if (this.props.container !== prevProps.container) {
      this.handleSavingModal(prevProps);
    }
  }

  initState(props) {
    const { container } = props;
    const { children } = container;
    const datasetContainer = children.length > 0 ? children[0] : null;
    const uiStoreContainerDataSet = (UIStore.getState() && UIStore.getState().containerDataSet) || { isSaving: false };
    const { isSaving } = uiStoreContainerDataSet;
    this.state = {
      container,
      modal: {
        show: false,
        datasetContainer: null,
      },
    };
    if (isSaving && datasetContainer) {
      UIActions.saveAttachmentDataset.defer('', false, datasetContainer.id);
      this.state.modal = { show: true, datasetContainer: datasetContainer };
    }
  }

  handleSavingModal(prevProps) {
    const uiStoreContainerDataSet = (UIStore.getState() && UIStore.getState().containerDataSet) || { isSaving: false };
    const { isSaving, datasetID } = uiStoreContainerDataSet;
    if (isSaving && prevProps.container) {
      const { container } = this.props;
      const { children } = container;
      const prevChildren = prevProps.container.children;
      const childrenIds = children.map((item) => item.id);
      const prevChildrenIds = prevChildren.map((item) => item.id);
      let diffIds = childrenIds.filter((id) => !prevChildrenIds.includes(id));
      if (diffIds.length === 0) {
        diffIds = [datasetID];
      }
      UIActions.saveAttachmentDataset.defer('', false, datasetID);
      const filterChildren = children.filter((item) => diffIds.includes(item.id));
      const datasetContainer = filterChildren.length > 0 ? filterChildren[0] : null;
      this.setState({
        container: this.props.container,
        modal: { show: true, datasetContainer: datasetContainer },
      });
    } else {
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
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            <i className="fa fa-plus" />
          </Button>
        </div>
      );
    }
    return null;
  }

  render() {
    const { container, modal } = this.state;
    const { disabled, readOnly, elementID, templateType } = this.props;

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
            elementID={elementID}
            templateType={templateType}
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
  elementID: PropTypes.string,
  templateType: PropTypes.string,
};

ContainerDatasets.defaultProps = {
  readOnly: false,
  disabled: false,
  elementID: '',
  templateType: ''
};
