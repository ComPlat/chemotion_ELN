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

  handleAccordionOpen(key) {
    this.setState({activeContainer: key});
  }

  handleAdd() {
    const {sample} = this.state;
    let container = Container.buildEmpty();


    sample.container.children.push(container);

    const newKey = sample.container.children.length - 1;
    this.handleAccordionOpen(newKey);

    this.props.parent.setState({sample: sample})
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
        <div className="button-right" >
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
            Add container 2
          </Button>
        </div>
      )
    }
  }


  render() {
    const {sample, activeContainer} = this.state;
    const {readOnly} = this.props;

    var c = sample.container.children.length;
    if(c > 0 ){
      return (
        <div>
        <p>&nbsp;{this.addButton()}</p>
        <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
          {sample.container.children.map(
              (container, key) =>
              <Panel header={container.name} eventKey={key}
                  key={key} onClick={() => this.handleAccordionOpen(key)}>
                <ContainerComponent
                  readOnly={readOnly}
                  container={container}
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
