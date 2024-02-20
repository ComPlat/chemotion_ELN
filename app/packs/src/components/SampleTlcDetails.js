import React from 'react';
import PropTypes from 'prop-types';
import { Button, FormControl, Glyphicon, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Sample from 'src/models/Sample';

const TlcColumnDetails = ({sample, onChangeRfValue, solvIndex, rfValue, deleteTlcColumn
}) => {

  const rfArray = sample.rf_value;

  const changeRfTlcValue = (event, type) => {
    rfValue = event.target.value;
    onChangeRfValue(rfValue, solvIndex, type);
  };

  const obe = rfArray[solvIndex];
  return (
    <tr>
      <td width="50%">
        <FormControl
          componentClass="select"
          onChange={event => changeRfTlcValue(event, 'tlcVal')}
          placeholder="select"
          value={obe ? obe.tlcVal : ''}
        >
          <option value="-">-</option>
          <option value="cyclohexane">cyclohexane</option>
          <option value="CH₂Cl₂">CH₂Cl₂</option>
          <option value="NEt₃">NEt₃</option>
        </FormControl>
      </td>
      <td width="50%">
        <FormControl
          bsClass="bs-form--compact form-control"
          type="text"
          name="solvent_ratio"
          value={obe ? obe.rfVal : ''}
          onChange={event => changeRfTlcValue(event, 'rfVal')}
        />
      </td>
      <td>
        <Button
          bsStyle="danger"
          bsSize="small"
          onClick={() => deleteTlcColumn(solvIndex)}
        >
          <i className="fa fa-trash-o" />
        </Button>
      </td>
    </tr>
  );
};

const TlcGroup = ({
   sample, deleteTlcColumn, onChangeRfValue
}) => {
  const contents = [];
  const sampleRfArray = sample.rf_value;
  if (sampleRfArray && sampleRfArray.length != 0) {
    for (let key = 0; key < sampleRfArray.length; key++) {
      contents.push((
        <TlcColumnDetails
          key={key}
          solvIndex={key}
          sample={sample}
          deleteTlcColumn={deleteTlcColumn}
          onChangeRfValue={onChangeRfValue}
        />
      ));
    }
  }
  return (
    <tbody width="100%">
      <tr>
        <th width="50%">Tlc-Solvent</th>
        <th width="50%">Rf-Value</th>
      </tr>
      {contents.map(item => item)}
    </tbody>
  );
};

// eslint-disable-next-line react/prefer-stateless-function
class SampleTlcDetails extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const {
      sample, deleteTlcColumn, addTlcColumn, onChangeRfValue
    } = this.props;

    return (
      <table width="100%" >
        <tbody>
          <tr>
            <td>
              <OverlayTrigger placement="top" overlay={<Tooltip id="newRfValueButton">Add new Rf-value</Tooltip>}>
                <Button
                  bsStyle="success"
                  bsSize="small"
                  onClick={addTlcColumn}
                >
                  <Glyphicon glyph="plus" />
                </Button>
              </OverlayTrigger>
            </td>
          </tr>
        </tbody>
        <TlcGroup
          sample={sample}
          deleteTlcColumn={deleteTlcColumn}
          onChangeRfValue={onChangeRfValue}
        />
      </table>
    );
  }
}

export default SampleTlcDetails;

SampleTlcDetails.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  deleteTlcColumn: PropTypes.func.isRequired,
  addTlcColumn: PropTypes.func.isRequired,
  onChangeRfValue: PropTypes.func.isRequired
};
