import React from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon, ListGroup } from 'react-bootstrap';
import SampleDetailsComponents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponents'; ; 
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';

const SampleComponentsGroup = ({
    sampleComponents, sampleComponentGroup, deleteMixtureComponent, onChange, sample,
    headIndex, dropComponent, dropSample,
  }) => {
    const contents = [];
    let index = headIndex;
    if (sampleComponents && sampleComponents.length > 0) {
      sampleComponents.forEach((sampleComponent) => {
        index += 1;
        contents.push((
          <SampleDetailsComponents
            sample={sample}
            onChange={onChange}
            key={sampleComponent.id}
            sampleComponent={sampleComponent}
            sampleComponentGroup={sampleComponentGroup}
            deleteMixtureComponent={sc => deleteMixtureComponent(sc, sampleComponentGroup)}
            index={index}
            dropComponent={dropComponent}
            dropSample={dropSample}
           />
        ));
      });
    }
  
    const headers = {
      group: 'Mixture Components',
      mass: 'Mass',
      molecular_mass: 'MW',
      amount: 'Amount',
      concn: 'Conc.',
      vol: 'Vol.',
      eq: 'Equiv.'
    };
  
    const addSampleButton = (
      <Button
        bsStyle="success"
        bsSize="xs"
        onClick={() => ElementActions.addSampleToMaterialGroup({ sample, materialGroup })}
      >
        <Glyphicon glyph="plus" />
      </Button>
    );
  
    return (
      <div>
        <table width="100%" className="sample-scheme">
        <ListGroup fill="true">
          <h5 style={{ fontWeight: 'bold' }}>Mixture Components:</h5>
          {/* TO DO  */}
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>{addSampleButton}</th>
              <th>{headers.group}</th>
              <th>{headers.molecular_mass}</th>
              <th>{headers.amount}</th>
              <th>{headers.mass}</th>
              <th>{headers.concn}</th>
              <th>{headers.vol}</th>
              <th>{headers.eq}</th> 
            </tr>
          </thead>
          <tbody>
            {contents.map(item => item)}
          </tbody>
          </ListGroup>
        </table>
      </div>
    );
  };
  
  SampleComponentsGroup.propTypes = {
    sampleComponentGroup: PropTypes.string.isRequired,
    headIndex: PropTypes.number.isRequired,
    sampleComponents: PropTypes.arrayOf(PropTypes.shape).isRequired,
    deleteMixtureComponent: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    sample: PropTypes.instanceOf(Sample).isRequired,
    dropComponent: PropTypes.func.isRequired,
    dropSample: PropTypes.func.isRequired,
  };
  
  export default SampleComponentsGroup;
