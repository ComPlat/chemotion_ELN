import React from 'react';
import PropTypes from 'prop-types';
import {
  ListGroup, ListGroupItem, Collapse, Button, ButtonGroup
} from 'react-bootstrap';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsSolventsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsSolventsDnd';

export default class SampleDetailsSolvents extends React.Component {
  constructor(props) {
    super(props);

    const { sample } = props;
    this.state = {
      open: false,
      sample
    };

    this.dropSample = this.dropSample.bind(this);
    this.deleteSolvent = this.deleteSolvent.bind(this);
    this.onChangeSolvent = this.onChangeSolvent.bind(this);
  }

  onChangeSolvent(solvent) {
    const { sample } = this.state;
    sample.updateSolvent(solvent);
    this.props.onChange(sample);
  }

  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { sample } = this.state;
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      // Create new Sample with counter
      splitSample = Sample.buildNew(srcSample, sample.collection_id, tagGroup);
    } else if (srcSample instanceof Sample) {
      splitSample = srcSample.buildChild();
    }

    sample.addSolvent(splitSample);
    this.props.onChange(sample);
  }

  deleteSolvent(solvent) {
    const { sample } = this.state;
    sample.deleteSolvent(solvent);
    this.props.onChange(sample);
  }

  solventCollapseBtn() {
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
        >
          {arrow}
          {' '}
      &nbsp; Solvents
        </Button>
      </ButtonGroup>
    );
  }

  render() {
    const {
      sample, isOver, canDrop
    } = this.props;
    const minPadding = { padding: '4px 4px 4px 4px' };
    const style = {
      padding: '2px 5px',
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    return (
      <div>
        <ListGroup fill="true">
          <ListGroupItem style={minPadding}>
            {this.solventCollapseBtn()}
            <Collapse in={this.state.open}>
              <div>
                <SampleDetailsSolventsDnd
                  sample={sample}
                  dropSample={this.dropSample}
                  deleteSolvent={this.deleteSolvent}
                  onChangeSolvent={(changeEvent) => this.onChangeSolvent(changeEvent)}
                />
              </div>
            </Collapse>
          </ListGroupItem>
        </ListGroup>
      </div>
    );
  }
}

SampleDetailsSolvents.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onChange: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

SampleDetailsSolvents.defaultProps = {
  canDrop: true,
  isOver: false
};
