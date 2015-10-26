import React, {Component} from 'react';
import {ListGroup, ListGroupItem, Button, ButtonToolbar, Well} from 'react-bootstrap';
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
    const newDataset = Dataset.buildEmpty();
    analysis.datasets.push(newDataset);
    this.handleModalOpen(newDataset);
    this.props.onChange(analysis);
  }

  handleChange(dataset) {
    const {analysis} = this.state;
    analysis.updateDataset(dataset);
    this.props.onChange(analysis);
  }

  handleRemove(dataset) {
    const {analysis} = this.state;
    const index = analysis.datasets.indexOf(dataset);
    analysis.datasets.splice(index, 1);
    this.props.onChange(analysis);
  }

  handleModalHide() {
    const {modal} = this.state;
    modal.show = false;
    modal.dataset = null;
    this.setState({modal});
  }

  addButton() {
    const {readOnly} = this.props;
    if(!readOnly) {
      return (
        <div className="pull-right" style={{marginTop: 5, marginBottom: 5}}>
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            <i className="fa fa-plus"></i>
          </Button>
        </div>
      )
    }
  }

  removeButton(dataset) {
    const {readOnly} = this.props;
    if(!readOnly) {
      return (
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleRemove(dataset)}>
          <i className="fa fa-trash-o"></i>
        </Button>
      );
    }
  }

  render() {
    const {analysis, modal} = this.state;
    if(analysis.datasets.length > 0) {
      return (
        <div>
          <Well style={{minHeight: 148, paddingBottom: 46}}>
            <ListGroup style={{marginBottom: 0}}>
              {analysis.datasets.map((dataset, key) => {
                return (
                  <ListGroupItem key={key}>
                    <a style={{cursor: 'pointer'}} onClick={() => this.handleModalOpen(dataset)}>{dataset.name}</a>
                    <span className="pull-right">
                      <ButtonToolbar>
                        <Button bsSize="xsmall" bsStyle="info" onClick={() => alert("zip download not implemented yet.")}>
                          <i className="fa fa-download"></i>
                        </Button>
                        {this.removeButton(dataset)}
                      </ButtonToolbar>
                    </span>
                  </ListGroupItem>
                )
              })}
            </ListGroup>
            {this.addButton()}
          </Well>
          <DatasetModal
            onHide={() => this.handleModalHide()}
            onChange={dataset => this.handleChange(dataset)}
            show={modal.show}
            readOnly={this.props.readOnly}
            dataset={modal.dataset}
            />
        </div>
      );
    } else {
      return(
        <div>
          <Well style={{minHeight: 148}}>
            There are currently no Datasets.<br/>
            {this.addButton()}
          </Well>
        </div>
      )
    }
  }
}
