import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, FormControl, ListGroup, ListGroupItem
} from 'react-bootstrap';
import Molecule from 'src/models/Molecule';
import VirtualizedSelect from 'react-virtualized-select';
import { defaultMultiSolventsSmilesOptions } from 'src/components/staticDropdownOptions/options';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';

function SolventDetails({ solvent, deleteSolvent, onChangeSolvent }) {
  if (!solvent) {
    return (<></>);
  }

  const changeLabel = (event) => {
    solvent.label = event.target.value;
    onChangeSolvent(solvent);
  };

  const changeRatio = (event) => {
    solvent.ratio = event.target.value;
    onChangeSolvent(solvent);
  };

  // onChangeRatio
  return (
    <tr>
      <td>
        <FormControl
          type="text"
          name="solvent_label"
          value={solvent.label}
          onChange={changeLabel}
          disabled
        />
      </td>
      <td>
        <FormControl
          type="number"
          name="solvent_ratio"
          value={solvent.ratio}
          onChange={changeRatio}
        />
      </td>
      <td>
        <Button
          bsStyle="danger"
          onClick={() => deleteSolvent(solvent)}
          style={{
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="fa fa-trash-o fa-lg" />
        </Button>
      </td>
    </tr>
  );
}

function SampleSolventGroup({
  materialGroup, sample, dropSample, deleteSolvent, onChangeSolvent
}) {
  const contents = [];
  const sampleSolvents = sample.solvent;
  const minPadding = { padding: '4px 4px 4px 4px' };

  if (sampleSolvents && sampleSolvents.length > 0) {
    let key = -1;
    sampleSolvents.forEach((solv) => {
      key += 1;
      contents.push((
        <SolventDetails
          key={key}
          solvent={solv}
          deleteSolvent={deleteSolvent}
          onChangeSolvent={onChangeSolvent}
        />
      ));
    });
  }

  const createDefaultSolvents = (event) => {
    const solvent = event.value;
    const smi = solvent.smiles;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        const d = molecule.density;
        const solventDensity = solvent.density || 1;
        molecule.density = (d && d > 0) || solventDensity;
        dropSample(molecule, null, materialGroup, solvent.external_label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const solventOptions = Object.keys(ionic_liquids).reduce((solvents, ionicLiquid) => solvents.concat({
    label: ionicLiquid,
    value: {
      external_label: ionicLiquid,
      smiles: ionic_liquids[ionicLiquid],
      density: 1.0
    }
  }), defaultMultiSolventsSmilesOptions);

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <ListGroup fill="true">
          <h5 style={{ fontWeight: 'bold' }}>Solvents:</h5>
          <ListGroupItem style={minPadding}>
            <div className="properties-form">
              <VirtualizedSelect
                name="default solvents"
                multi={false}
                options={solventOptions}
                placeholder="Select solvents or drag-n-drop molecules from the sample list"
                onChange={createDefaultSolvents}
                menuContainerStyle={{ minHeight: '200px' }}
                style={{ marginBottom: '10px' }}
              />
              { sampleSolvents && sampleSolvents.length > 0 && (
                <>
                  <td style={{ width: '50%', fontWeight: 'bold' }}>Label:</td>
                  <td style={{ width: '50%', fontWeight: 'bold' }}>Ratio:</td>
                </>
              )}
              {contents.map((item) => item)}
            </div>
          </ListGroupItem>
        </ListGroup>
      </table>
    </div>
  );
}

SampleSolventGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  headIndex: PropTypes.number.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool,
  addDefaultSolvent: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool
};

SampleSolventGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false
};

export { SampleSolventGroup };
