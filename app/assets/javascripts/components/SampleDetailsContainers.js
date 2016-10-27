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
    sample.container.children.push(container);

    const newKey = sample.container.children.length - 1;
    this.handleAccordionOpen(newKey);

    this.props.parent.setState({sample: sample})
  }

  handleRemove(container) {
    let {sample} = this.state;

    //const index = sample.container.children.indexOf(container);
    //sample.container.children.splice(index, 1);
    container.is_deleted = true;
    
    this.props.parent.setState({sample: sample})
  }

  handleAccordionOpen(key) {
    this.setState({activeContainer: key});
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
        <div className="button-right" >
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            Add container
          </Button>
        </div>
      )
    }
  }


  render() {
    const {sample, activeContainer} = this.state;
    const {readOnly} = this.props;

    let containerHeader = (container) => <p style={{width: '100%'}}>{container.name}
      {('Platzhalter' && 'Platzhalter' != '') ? (' - Type: ' + 'Platzhalter') : ''}
      {('Platzhalter' && 'Platzhalter' != '') ? (' - Status: ' + 'Platzhalter') :''}
      <Button bsSize="xsmall" bsStyle="danger"
         className="button-right" disabled={readOnly}
        onClick={() => {if(confirm('Delete the container?')) {this.handleRemove(container)}}}>
        <i className="fa fa-trash"></i>
      </Button></p>


    var c = sample.container.children.length;
    if(c > 0 ){
      return (
        <div>
        <p>&nbsp;{this.addButton()}</p>
        <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
          {sample.container.children.map(
              (container, key) =>
              <Panel header={containerHeader(container)} eventKey={key}
                  key={key} onClick={() => this.handleAccordionOpen(key)}>
                <ContainerComponent
                  readOnly={readOnly}
                  container={container}
                  onChange={container => this.handleChange(container)}
                />
              </Panel>
            )}
          </PanelGroup>
        </div>
      )
    }else {
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
