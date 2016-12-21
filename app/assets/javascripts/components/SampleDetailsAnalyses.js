import React, {Component} from 'react';
import {PanelGroup, Panel, Button, Row, Col} from 'react-bootstrap';
import AnalysisComponent from './Analysis';
import Analysis from './models/Analysis';
import Utils from './utils/Functions';

export default class SampleDetailsAnalyses extends Component {
  constructor(props) {
    super();
    const {sample} = props;
    this.state = {
      sample,
      activeAnalysis: 0
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      sample: nextProps.sample
    })
  }

  handleChange(analysis) {
    const {sample} = this.state
    sample.updateAnalysis(analysis)
    this.props.parent.handleSampleChanged(sample)
  }

  handleAdd() {
    const {sample} = this.state;
    // model: sample.createAnalysis()

    let analysis = Analysis.buildEmpty();

    sample.addAnalysis(analysis);

    const newKey = sample.analyses.length - 1;
    this.handleAccordionOpen(newKey);

    this.props.parent.setState({sample: sample})
  }

  handleRemove(analysis) {
    let {sample} = this.state;
    sample.removeAnalysis(analysis);
    this.props.parent.setState({sample: sample})
  }

  handleAccordionOpen(key) {
    this.setState({activeAnalysis: key});
  }

  addButton() {
    const {readOnly} = this.props;
    if(! readOnly) {
      return (
        <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
          Add analysis
        </Button>
      )
    }
  }

  analysisCodePrintButtons(analysis, sample) {
    if(analysis.isNew)
      return ''
    else if(analysis.kind.includes("NMR"))
      return (
        <div style={{display: "inline-block", position: "absolute", right: "100px"}}>
          <Button bsSize="xsmall"
            onClick={() => Utils.downloadFile({contents: "api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + analysis.id + "&type=nmr_analysis&size=small"})}>
            <i className="fa fa-barcode fa-lg"></i>
          </Button>
        </div>
      )
    else
      return (
        <div style={{display: "inline-block", position: "absolute", right: "100px"}}>
          <Button bsSize="xsmall"
            onClick={() => Utils.downloadFile({contents: "api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + analysis.id + "&type=analysis&size=small"})}>
            <i className="fa fa-barcode fa-lg"></i>
          </Button>
          &nbsp;
          <Button bsSize="xsmall"
            onClick={() => Utils.downloadFile({contents: "api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + analysis.id + "&type=analysis&size=big"})}>
            <i className="fa fa-barcode fa-2x"></i>
          </Button>
        </div>
      )
  }

  render() {
    const {sample, activeAnalysis} = this.state;
    const {readOnly} = this.props;

    let analysisHeader = (analysis) => <p style={{width: '100%'}}>{analysis.name}
      {(analysis.kind && analysis.kind != '') ? (' - Type: ' + analysis.kind) : ''}
      {(analysis.status && analysis.status != '') ? (' - Status: ' + analysis.status) :''}
      <Button bsSize="xsmall" bsStyle="danger"
         className="button-right" disabled={readOnly}
        onClick={() => {if(confirm('Delete the analysis?')) {this.handleRemove(analysis)}}}>
        <i className="fa fa-trash"></i>
      </Button>{this.analysisCodePrintButtons(analysis, sample)}</p>

    if(sample.analyses.length > 0) {
      return (
        <div>
          <p>&nbsp;{this.addButton()}</p>
          <PanelGroup defaultActiveKey={0} activeKey={activeAnalysis} accordion>
            {sample.analyses.map(
              (analysis, key) =>
                <Panel header={analysisHeader(analysis)} eventKey={key}
                    key={key} onClick={() => this.handleAccordionOpen(key)}>
                  <AnalysisComponent
                    readOnly={readOnly}
                    analysis={analysis}
                    onChange={analysis => this.handleChange(analysis)}
                    />
                </Panel>
            )}
          </PanelGroup>
        </div>
      );
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

SampleDetailsAnalyses.propTypes = {
  readOnly: React.PropTypes.bool,
  parent: React.PropTypes.object,
};
