import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';
import NumeralInput from 'src/apps/mydb/elements/details/NumeralInput';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class ElementalCompositionTable extends React.Component {
  static checkElementsSum(experimentalData) {
    let sum = 0.0;
    Object.values(experimentalData).forEach((value) => {
      if (value && value !== '') {
        sum += parseFloat(value) || 0.0;
      }
    });

    if (sum > 100.0) {
      NotificationActions.add({
        message: 'Percentage sum is more than 100%',
        level: 'error'
      });
      return false;
    }
    return true;
  }

  static calculateDifference(experimental, theoretical) {
    const expVal = parseFloat(experimental);
    const theoVal = parseFloat(theoretical);

    if (Number.isNaN(expVal) || Number.isNaN(theoVal)) {
      return null;
    }

    return expVal - theoVal;
  }

  constructor(props) {
    super(props);
    this.handleElementChange = this.handleElementChange.bind(this);
  }

  handleElementChange(value, element) {
    const { experimentalComposition, onExperimentalChange } = this.props;

    if (!experimentalComposition) return;

    const updatedData = { ...experimentalComposition.data };
    updatedData[element] = value;

    if (ElementalCompositionTable.checkElementsSum(updatedData)) {
      const updatedComposition = { ...experimentalComposition, data: updatedData };
      onExperimentalChange(updatedComposition);
    }
  }

  renderTableRows() {
    const {
      theoreticalComposition,
      experimentalComposition,
      readOnly = false
    } = this.props;

    if (!theoreticalComposition || !theoreticalComposition.data) {
      return null;
    }

    const theoreticalData = theoreticalComposition.data;
    const experimentalData = experimentalComposition?.data || {};

    // Get all elements from both compositions
    const allElements = new Set([
      ...Object.keys(theoreticalData),
      ...Object.keys(experimentalData)
    ]);

    return Array.from(allElements).sort().map((element) => {
      const theoreticalValue = theoreticalData[element];
      const experimentalValue = experimentalData[element];
      const hasExperimentalValue = experimentalValue && experimentalValue !== '' && experimentalValue !== '0.0';
      const difference = hasExperimentalValue
        ? ElementalCompositionTable.calculateDifference(experimentalValue, theoreticalValue)
        : null;

      return (
        <tr key={element}>
          <td className="fw-bold">{element}</td>
          <td>
            {theoreticalValue ? Number(theoreticalValue).toFixed(2) : '—'}
          </td>
          <td>
            {readOnly ? (
              <span>
                {hasExperimentalValue ? Number(experimentalValue).toFixed(2) : '—'}
              </span>
            ) : (
              <NumeralInput
                numeralFormat="0,0.00"
                value={experimentalValue || ''}
                onChange={(v) => this.handleElementChange(v, element)}
                placeholder="—"
              />
            )}
          </td>
          <td>
            {difference !== null ? (
              <span
                className={(() => {
                  if (difference > 0) return 'text-success';
                  if (difference < 0) return 'text-danger';
                  return '';
                })()}
              >
                {difference > 0 ? '+' : ''}
                {difference.toFixed(2)}
              </span>
            ) : '—'}
          </td>
        </tr>
      );
    });
  }

  render() {
    const { theoreticalComposition, experimentalComposition, loading } = this.props;

    if (!theoreticalComposition) {
      return (
        <p>
          Sorry, it was not possible to calculate the elemental
          composition. Check data please.
        </p>
      );
    }

    return (
      <div>
        <Table bordered size="sm" className="mb-3">
          <thead>
            <tr>
              <th className="w-25">Element</th>
              <th className="w-25">
                Theoretical (%)
                <br />
                <small className="text-muted">{theoreticalComposition?.description}</small>
              </th>
              <th className="w-25">
                Experimental (%)
                <br />
                <small className="text-muted">
                  {experimentalComposition?.description || 'Experimental values'}
                </small>
              </th>
              <th className="w-25">
                Difference
                <br />
                <small className="text-muted">(exp - theo)</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {this.renderTableRows()}
          </tbody>
        </Table>

        {typeof loading === 'number' && (
          <div className="text-muted">
            <small>
              Loading:
              {loading.toFixed(2)}
              mmol/g
            </small>
          </div>
        )}
      </div>
    );
  }
}

ElementalCompositionTable.propTypes = {
  theoreticalComposition: PropTypes.shape({
    data: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    description: PropTypes.string,
  }).isRequired,
  experimentalComposition: PropTypes.shape({
    data: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    description: PropTypes.string,
  }),
  onExperimentalChange: PropTypes.func.isRequired,
  loading: PropTypes.number,
  readOnly: PropTypes.bool,
};

ElementalCompositionTable.defaultProps = {
  experimentalComposition: null,
  loading: null,
  readOnly: false,
};
