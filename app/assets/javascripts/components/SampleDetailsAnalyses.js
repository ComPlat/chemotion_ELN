import React, {Component} from 'react';
import {PanelGroup, Panel, Button, Row, Col} from 'react-bootstrap';
import Analysis from './Analysis';

export default class SampleDetailsAnalyses extends Component {
  constructor(props) {
    super(props);
    const {sample} = this.props;
    this.state = {
      sample,
      activeAnalysis: 0
    };
  }

  changeAnalysis(changedAnalysis) {
    const {sample} = this.state;
    const {analyses} = sample;
    analyses.find(analysis => {
      if(analysis.id == changedAnalysis.id) {
        const analysisId = analyses.indexOf(analysis);
        analyses[analysisId] = changedAnalysis;
      }
    });
    this.setState({sample});
  }

  addAnalysis() {
    const {sample} = this.state;
    //uuid: new-12656512
    sample.analyses.push({id: '_new_', name: 'new Analysis', datasets: []});
    const newKey = sample.analyses.length - 1;
    this.setState({sample, activeAnalysis: newKey});
  }

  removeAnalysis(analysis) {
    const {sample} = this.state;
    const analysisId = sample.analyses.indexOf(analysis);
    sample.analyses.splice(analysisId, 1);
    this.setState({sample});
  }

  openAnalysis(key) {
    this.setState({activeAnalysis: key});
  }

  render() {
    const {sample, activeAnalysis} = this.state;
    return (
      <div>
        <PanelGroup defaultActiveKey={0} activeKey={activeAnalysis} accordion>
          {sample.analyses.map((analysis, key) => {
            return (
              <Panel header={analysis.name} key={key} onClick={() => this.openAnalysis(key)} eventKey={key}>
                <Analysis
                  analysis={analysis}
                  changeAnalysis={analysis => this.changeAnalysis(analysis)}
                  removeAnalysis={analysis => this.removeAnalysis(analysis)}
                  />
              </Panel>
            )
          })}
        </PanelGroup>
        <div className="pull-right" style={{marginTop: -12}}>
          <Button bsSize="xsmall" bsStyle="success" onClick={() => this.addAnalysis()}>
            <i className="fa fa-plus"></i>
          </Button>
        </div>
      </div>
    );
  }
}
