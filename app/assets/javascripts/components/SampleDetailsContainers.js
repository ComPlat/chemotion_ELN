import React, {Component} from 'react';
import {PanelGroup, Panel, Button, Row, Col} from 'react-bootstrap';
import Container from './models/Container';
import ContainerComponent from './ContainerComponent';

export default class SampleDetailsContainers extends Component {
  constructor(props) {
    super();
    const {sample} = props;
    this.state = {
      sample,
      activeContainer: 0
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      sample: nextProps.sample
    })
  }

  handleChange(container) {
    const {sample} = this.state
    //sample.updateAnalysis(analysis)
    this.props.parent.handleSampleChanged(sample)
  }

  handleAdd() {
    const {sample} = this.state;
    let container = Container.buildEmpty();
    container.container_type = "analysis";

    sample.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.push(container);

    const newKey = sample.container.children.filter(element => ~element.container_type.indexOf('analyses'))[0].children.length - 1;

    this.handleAccordionOpen(newKey);

    this.props.parent.setState({sample: sample})
  }

  handleRemove(container) {
    let {sample} = this.state;
    container.is_deleted = true;

    this.props.parent.setState({sample: sample})
  }

  handleUndo(container) {
    let {sample} = this.state;
    container.is_deleted = false;

    this.props.parent.setState({sample: sample})
  }

  handleAccordionOpen(newKey) {
    const currentKey = this.state.activeContainer;
    if(currentKey !== newKey) {
      this.setState({activeContainer: newKey});
    }
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
        //<div className="button-right" >
          <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            Add analysis
          </Button>
        //</div>
      )
    }
  }

  toggleAddToReport(e, container) {
    e.stopPropagation();
    container.extended_metadata['report'] = !container.extended_metadata['report'];
    this.handleChange(container);
  }

  analysisHeader(container, readOnly) {
    const confirmDelete = () => {
      if(confirm('Delete the analysis?')) {
        this.handleRemove(container)
      }
    };
    const kind = (container.extended_metadata['kind'] && container.extended_metadata['kind'] != '')
      ? (' - Type: ' + container.extended_metadata['kind'])
      : ''
    const status = (container.extended_metadata['status'] && container.extended_metadata['status'] != '')
      ? (' - Status: ' + container.extended_metadata['status'])
      :''

    var inReport;
    if(typeof container.extended_metadata['report'] == 'string'){
      inReport = container.extended_metadata['report'] === 'true'
      container.extended_metadata['report'] = inReport;
    }else{
      inReport = container.extended_metadata['report'];
    }

    return (
      <div style={{width: '100%'}}>
        {container.name}
        {kind}
        {status}
        <div className="button-right">
          <label>
            <input onClick={(e) => this.toggleAddToReport(e, container)}
                   type="checkbox"
                   defaultChecked={inReport} />
            <span>Add to Report</span>
          </label>
          <Button bsSize="xsmall"
                  bsStyle="danger"
                  className="g-marginLeft--20"
                  disabled={readOnly}
                  onClick={confirmDelete}>
            <i className="fa fa-trash"></i>
          </Button>
        </div>
      </div>
    );
  }

  analysisHeaderDeleted(container, readOnly) {

    const kind = (container.extended_metadata['kind'] && container.extended_metadata['kind'] != '')
      ? (' - Type: ' + container.extended_metadata['kind'])
      : ''
    const status = (container.extended_metadata['status'] && container.extended_metadata['status'] != '')
      ? (' - Status: ' + container.extended_metadata['status'])
      :''

    return (
      <div style={{width: '100%'}}>
        <strike>{container.name}
        {kind}
        {status}</strike>
        <div className="button-right">
          <Button className="pull-right" bsSize="xsmall" bsStyle="danger" onClick={() => this.handleUndo(container)}>
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const {sample, activeContainer} = this.state;
    const {readOnly} = this.props;

    if (sample.container == null) {
      return (
        <div><p className='noAnalyses-warning'>Not available.</p></div>
      )
    }

    let analyses_container =
      sample.container.children.filter(element => ~element.container_type.indexOf('analyses'));

    if (analyses_container.length == 1 && analyses_container[0].children.length > 0) {
      return (
        <div>
          <p>&nbsp;{this.addButton()}</p>
          <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
          {analyses_container[0].children.map((container, key) => {
            if (container.is_deleted) {
              return (
                <Panel header={this.analysisHeaderDeleted(container, readOnly)}
                       eventKey={key} key={key + "_analysis"} >
                </Panel>
              );
            }

            return (
              <Panel header={this.analysisHeader(container, readOnly)}
                     eventKey={key} key={key + "_analysis"}
                     onClick={() => this.handleAccordionOpen(key)}>
                <ContainerComponent
                  readOnly={readOnly}
                  container={container}
                  onChange={container => this.handleChange(container)}
                />
              </Panel>
            );
          })}
          </PanelGroup>
        </div>
      )
    } else {
      return (
        <div>
          <p className='noAnalyses-warning'>
            There are currently no Analyses.
            {this.addButton()}
          </p>
        </div>
      )
    }
  }

}

SampleDetailsContainers.propTypes = {
  readOnly: React.PropTypes.bool,
  parent: React.PropTypes.object,
};
