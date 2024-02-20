import React from 'react';
import PropTypes from 'prop-types';
import { ListGroup, ListGroupItem, Collapse, Button, ButtonGroup } from 'react-bootstrap';
import Sample from 'src/models/Sample';
import SampleTlcDetails from 'src/components/SampleTlcDetails';


export default class SampleTlcControl extends React.Component {
  constructor(props) {
    super(props);

    const { sample } = props;
    this.state = {
      sample: sample
    };

    this.deleteTlcColumn = this.deleteTlcColumn.bind(this);
    this.addTlcColumn = this.addTlcColumn.bind(this);
    this.onChangeRfValue = this.onChangeRfValue.bind(this);

    this.handleFieldChanged = this.handleFieldChanged.bind(this);
  }

  onChangeRfValue(rfValue, solvIndex, type) {
    const { sample } = this.state;
    sample.updateRfValue(rfValue, solvIndex, type);
    this.props.onChange(sample);
  }

  updateTlcSolvent(e) {
    const { sample } = this.props;
    sample.tlc_solvents = e.value;
    this.props.onChange(sample);
  }

  tlcCollapseBtn() {
    const { open } = this.state;
    const arrow = open
      ? <i className="fa fa-angle-double-up" />
      : <i className="fa fa-angle-double-down" />;
    return (
      <ButtonGroup vertical block>
        <Button
          id="Solvents"
          bsSize="xsmall"
          style={{ backgroundColor: '#ddd' }}
          onClick={() => this.setState({ open: !open })}
        >{arrow} &nbsp; TLC Control
        </Button>
      </ButtonGroup>
    );
  }

  deleteTlcColumn(solvIndex) {
    const { sample } = this.state;
    sample.deleteTlcColumn(solvIndex);
    this.props.onChange(sample);
  }

  addTlcColumn() {
    const { sample } = this.state;
    this.props.onChange(sample);
    sample.addTlcColumn();
  }

  handleFieldChanged(field, e) {
    const { sample } = this.props;
    sample[field] = e;
    this.props.onChange(sample);
  }

  render() {
    const {
      sample
    } = this.props;

    const style = {
      paddingTop: '5px',
    };

    return (
      <div>
        <ListGroup fill="true">
          <ListGroupItem>
            { this.tlcCollapseBtn() }
            <Collapse in={this.state.open} style={style}>
              <div>
                <SampleTlcDetails
                  sample={sample}
                  deleteTlcColumn={this.deleteTlcColumn}
                  addTlcColumn={this.addTlcColumn}
                  onChangeRfValue={this.onChangeRfValue}
                />
              </div>
            </Collapse>
          </ListGroupItem>
        </ListGroup>
      </div>
    );
  }
}

SampleTlcControl.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onChange: PropTypes.func.isRequired
};
