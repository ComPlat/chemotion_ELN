import React, {Component} from 'react';
import {ListGroup, ListGroupItem, Button, Well} from 'react-bootstrap';
import DatasetModal from './DatasetModal';
import Dataset from './models/Dataset';

export default class AnalysisDatasets extends Component {
  constructor(props) {
    super();
    const {analysis} = props;
    this.state = {
      analysis,
      modal: {
        show: false,
        dataset: null
      }
    };
  }

  handleModalOpen(dataset) {
    const {modal} = this.state;
    modal.dataset = dataset;
    modal.show = true;
    this.setState({modal});
  }

  handleAdd(){
    const {analysis} = this.state;
    // TODO move to analysis model
    // analysis.createDataset()
    const newDataset = Dataset.buildEmpty();
    analysis.datasets.push(newDataset);
    // TODOEND
    this.handleModalOpen(newDataset);
    this.props.onChange(analysis);
  }

  handleChange(dataset) {
    const {analysis} = this.state;
    // -> model: analysis.updateDataset(dataset)
    this.props.onChange(analysis);
  }

  handleRemove(dataset) {
    const {analysis} = this.state;
    // analysis.removeDataset()
    const datasetId = analysis.datasets.indexOf(dataset);
    analysis.datasets.splice(datasetId, 1);
    this.props.onChange(analysis);
  }

  handleModalHide(actionType, dataset) {
    const {modal} = this.state;
    modal.show = false;
    modal.dataset = null;
    this.setState({modal});
  }

  render() {
    const {analysis, modal} = this.state;
    return (
      <div>
        <Well style={{minHeight: 148}}>
          <ListGroup style={{marginBottom: 0}}>
            {analysis.datasets.map((dataset, key) => {
              return (
                <ListGroupItem key={key}>
                  <a style={{cursor: 'pointer'}} onClick={() => this.handleModalOpen(dataset)}>{dataset.name}</a>
                    <span className="pull-right">
                      <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleRemove(dataset)}>
                        <i className="fa fa-trash-o"></i>
                      </Button>
                    </span>
                </ListGroupItem>
              )
            })}
          </ListGroup>
            <span className="pull-right">
              <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
                <i className="fa fa-plus"></i>
              </Button>
            </span>
        </Well>
        <DatasetModal
          onHide={() => this.handleModalHide()}
          onChange={dataset => this.handleChange(dataset)}
          show={modal.show}
          dataset={modal.dataset}
          />
      </div>
    );
  }
}
