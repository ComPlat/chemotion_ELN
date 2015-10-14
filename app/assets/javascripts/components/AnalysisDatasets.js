import React, {Component} from 'react';
import {ListGroup, ListGroupItem, Button, Well} from 'react-bootstrap';
import DatasetModal from './DatasetModal';

export default class AnalysisDatasets extends Component {
  constructor(props) {
    super(props);
    const {analysis} = props;
    this.state = {
      analysis,
      modal: {
        show: false,
        dataset: null
      }
    };
  }

  openModal(dataset) {
    const {modal} = this.state;
    modal.dataset = dataset;
    modal.show = true;
    this.setState({modal});
  }

  addDataset(){
    const {analysis} = this.state;
    //uuid: new-9232639263
    const newDataset = {id: '_new_', name: 'new Dataset', files: [], description: '', instrument: ''};
    analysis.datasets.push(newDataset);
    this.setState({analysis});
    this.openModal(newDataset);
  }

  removeDataset(dataset) {
    const {analysis} = this.state;
    const datasetId = analysis.datasets.indexOf(dataset);
    analysis.datasets.splice(datasetId, 1);
    this.setState(analysis);
  }

  hideModal(actionType, dataset) {
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
                  <a style={{cursor: 'pointer'}} onClick={() => this.openModal(dataset)}>{dataset.name}</a>
                    <span className="pull-right">
                      <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.removeDataset(dataset)}>
                        <i className="fa fa-trash-o"></i>
                      </Button>
                    </span>
                </ListGroupItem>
              )
            })}
          </ListGroup>
            <span className="pull-right">
              <Button bsSize="xsmall" bsStyle="success" onClick={() => this.addDataset()}>
                <i className="fa fa-plus"></i>
              </Button>
            </span>
        </Well>
        <DatasetModal onHide={() => this.hideModal()} show={modal.show} dataset={modal.dataset}/>
      </div>
    );
  }
}
