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
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

function SolventDetails({ solvent, deleteSolvent, onChangeSolvent, sampleType }) {
  if (!solvent) {
    return null;
  }

  const changeLabel = (event) => {
    solvent.label = event.target.value;
    onChangeSolvent(solvent);
  };

  const changeRatio = (event) => {
    solvent.ratio = event.target.value;
    onChangeSolvent(solvent);
  };

  const changeVolume = (event) => {
    solvent.amount_l = event.value;
    onChangeSolvent(solvent);
  };

  // onChangeRatio
  const metricPrefixes = ['m', 'n', 'u'];
  const metric = (solvent.metrics && solvent.metrics.length > 2 && metricPrefixes.indexOf(solvent.metrics[1]) > -1) ? solvent.metrics[1] : 'm';
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
      {sampleType && sampleType === 'Mixture' && (
        <td style={{verticalAlign: 'bottom'}}>
          <NumeralInputWithUnitsCompo
            value={solvent.amount_l}
            unit="l"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={3}
            onChange={changeVolume}
          />
        </td>
      )}
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
  const sampleType = sample.sample_type;

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
          sampleType={sampleType}
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
        NotificationActions.add({
          title: 'Error',
          message: 'Failed to fetch molecule data.',
          level: 'error',
          dismissible: true,
          autoDismiss: 5
        });
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
              { sampleSolvents && sampleSolvents.length > 0 && sampleType === 'Mixture' && (
                <>
                  <td style={{ width: '35%', fontWeight: 'bold' }}>Label:</td>
                  <td style={{ width: '35%', fontWeight: 'bold' }}>Volume:</td>
                  <td style={{ width: '30%', fontWeight: 'bold' }}>Ratio:</td>
                </>
              )}
              { sampleSolvents && sampleSolvents.length > 0 && sampleType !== 'Mixture' && (
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

export { SampleSolventGroup, SolventDetails };
