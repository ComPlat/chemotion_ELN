import React from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon, ListGroup } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import Material from '../../reactions/schemeTab/Material';
import { permitOn } from 'src/components/common/uis';
import UIStore from 'src/stores/alt/stores/UIStore';

function dummy() { return false; }

const SampleComponentsGroup = ({
    materialGroup, deleteMixtureComponent, onChange, sample,
    headIndex, dropSample,
  }) => {
    const contents = [];
    let sampleComponents = sample.mixture_components;
    let index = headIndex;
    if (sampleComponents && sampleComponents.length > 0) {
      sampleComponents.forEach((sampleComponent) => {
        index += 1;
        contents.push((
          <Material
            sample={sample}
            onChange={onChange}
            key={sampleComponent.parent_id}
            material={sampleComponent}
            reaction={sample}
            materialGroup={materialGroup}
            deleteMaterial={sc => deleteMixtureComponent(sc, materialGroup)}
            index={index}
            dropMaterial={dummy}
            dropSample={dropSample}
           />
        ));
      });
    }
  
    const headers = {
      group: 'Mixture Components',
      mass: 'Mass',
      amount: 'Amount',
      concn: 'Conc',
      vol: 'Vol',
      eq: 'Ratio'
    };
  
    const { currentCollection } = UIStore.getState()

    const addSampleButton = (
      <Button
        disabled={!permitOn(sample)}
        bsStyle="success"
        bsSize="xs"
        onClick={() => ElementActions.addSampleToMaterialGroup({ sample, materialGroup, currentCollection })}
      >
        <Glyphicon glyph="plus" />
      </Button>
    );
  
    return (
      <div>
        <table width="100%" className="sample-scheme">
          <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: '4%', padding: '3px 3px' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '13%' }} />
          </colgroup>
          <thead>
            <tr>
            <th>{addSampleButton}</th>
            <th>{headers.group}</th>
            <th>{headers.amount}</th>
            <th />
            <th />
            <th>{headers.concn}</th>
            <th>{headers.eq}</th>
            </tr>
          </thead>
          <tbody>
            {contents.map(item => item)}
          </tbody>
        </table>
      </div>
    );
  };
  
  SampleComponentsGroup.propTypes = {
    materialGroup: PropTypes.string.isRequired,
    headIndex: PropTypes.number.isRequired,
    deleteMixtureComponent: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    sample: PropTypes.instanceOf(Sample).isRequired,
    dropSample: PropTypes.func.isRequired,
  };
  
  export default SampleComponentsGroup;
