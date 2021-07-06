import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, FormControl, Glyphicon
} from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import VirtualizedSelect from 'react-virtualized-select';
import DragDropItemTypes from './DragDropItemTypes';
import Sample from './models/Sample';
import Molecule from './models/Molecule';
import MoleculesFetcher from './fetchers/MoleculesFetcher';
import { ionic_liquids } from './staticDropdownOptions/ionic_liquids';
import { defaultMultiSolventsSmilesOptions } from './staticDropdownOptions/options';

const target = {
  drop(tagProps, monitor) {
    const { dropSample } = tagProps;
    const srcItem = monitor.getItem();
    const srcType = monitor.getItemType();
    if (srcType === DragDropItemTypes.SAMPLE) {
      dropSample(srcItem.element);
    } else if (srcType === DragDropItemTypes.MOLECULE) {
      dropSample(
        srcItem.element,
        null,
        true,
      );
    }
  },
  canDrop(tagProps, monitor) {
    const srcType = monitor.getItemType();
    const isCorrectType = srcType === DragDropItemTypes.SAMPLE
      || srcType === DragDropItemTypes.MOLECULE;
    return isCorrectType;
  },
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

const SolventDetails = ({solvent, deleteSolvent, onChangeSolvent}) => {
  if (!solvent) {
    return (<></>)
  }

  const changeLabel = (event) => {
    solvent.label = event.target.value;
    onChangeSolvent(solvent);
  }

  const changeRatio = (event) => {
    solvent.ratio = event.target.value;
    onChangeSolvent(solvent);
  }

  // onChangeRatio
  return (
    <tr>
      <td width="5%"></td>
      <td width="50%">
        <FormControl
          bsClass="bs-form--compact form-control"
          bsSize="small"
          type="text"
          name="solvent_label"
          value={solvent.label}
          onChange={changeLabel}
	  disabled
        />
      </td>
      <td width="26%">
        <FormControl
          bsClass="bs-form--compact form-control"
          bsSize="small"
          type="number"
          name="solvent_ratio"
          value={solvent.ratio}
          onChange={changeRatio}
        />
      </td>
      <td>
        <Button
          bsStyle="danger"
          bsSize="small"
          onClick={() => deleteSolvent(solvent)}
        >
          <i className="fa fa-trash-o" />
        </Button>
      </td>
    </tr>
  )
};

const SolventsGroup = ({
  materialGroup, sample, addDefaultSolvent, deleteSolvent, onChangeSolvent
}) => {
  const contents = []
  const sampleSolvents = sample.solvent
  if (sampleSolvents && sampleSolvents.length > 0) {
    let key = -1
    sampleSolvents.forEach((solv) => {
      key += 1
      contents.push((
        <SolventDetails
          key={key}
          solvent={solv}
          deleteSolvent={deleteSolvent}
          onChangeSolvent={onChangeSolvent}
        />
      ))
    })
  }

  const createDefaultSolvents = (event) => {
    const solvent = event.value;
    // MoleculesFetcher.fetchByMolfile(solvent.molfile)
    const smi = solvent.smiles;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        const d = molecule.density;
        const solventDensity = solvent.density || 1;
        molecule.density = (d && d > 0) || solventDensity;
        addDefaultSolvent(molecule, null, materialGroup, solvent.external_label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const solventOptions = Object.keys(ionic_liquids).reduce(
    (solvents, ionicLiquid) => solvents.concat({
      label: ionicLiquid,
      value: {
        external_label: ionicLiquid,
        smiles: ionic_liquids[ionicLiquid],
        density: 1.0
      }
    }), defaultMultiSolventsSmilesOptions
  );

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <thead>
          <tr>
            <th width="5%"></th>
            <th width="95%">
              <VirtualizedSelect
                className="solvents-select"
                name="default solvents"
                multi={false}
                options={solventOptions}
                placeholder="Select solvents or drag-n-drop molecules from the sample list"
                onChange={createDefaultSolvents}
              />
            </th>
          </tr>
        </thead>
      </table>
      <table width="100%" className="reaction-scheme">
        <thead>
          <tr>
            <th width="5%"></th>
            <th width="50%">Label</th>
            <th width="26%">Ratio</th>
            <th width="3%" />
          </tr>
        </thead>
        <tbody>
          {contents.map(item => item)}
        </tbody>
      </table>
    </div>
  );
};

class SampleDetailsSolventsDnd extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      sample,
      isOver, canDrop, connectDropTarget, dropSample, deleteSolvent, onChangeSolvent
    } = this.props;
    const style = {
      padding: '2px 5px',
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    return connectDropTarget(
      <div style={style}>
        <SolventsGroup 
          sample={sample}
          addDefaultSolvent={dropSample}
          deleteSolvent={deleteSolvent}
          onChangeSolvent={onChangeSolvent}
          />
      </div>
    );
  }
}

export default DropTarget(
  [DragDropItemTypes.SAMPLE, DragDropItemTypes.MOLECULE],
  target,
  collect,
)(SampleDetailsSolventsDnd);

SampleDetailsSolventsDnd.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  headIndex: PropTypes.number,
  onChangeSolvent: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  deleteSolvent: PropTypes.func.isRequired,
}
