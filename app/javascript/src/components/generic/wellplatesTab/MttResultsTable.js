import React from 'react';
import PropTypes from 'prop-types';
import { Button, Table, Badge } from 'react-bootstrap';
import BoxPlotVisualization from 'src/components/generic/BoxPlotVisualization';

function MttResultsTable({
  analyses,
  selectedAnalyses,
  onToggleSelection,
  onToggleSelectAll,
  onShowDetails,
  onDelete
}) {
  if (!analyses || analyses.length === 0) {
    return <p className="text-muted mb-0">No results available.</p>;
  }

  const allKeys = analyses.map(item => item.key);
  const allSelected = allKeys.length > 0 && allKeys.every(key => selectedAnalyses[key]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <Table bordered hover size="sm" className="bg-white">
        <thead className="bg-light">
          <tr>
            <th className="text-center" style={{ width: '40px' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleSelectAll(allKeys)}
                title={allSelected ? 'Deselect all' : 'Select all'}
              />
            </th>
            <th>Molecule</th>
            <th>Dose Response</th>
            <th>IC50</th>
            <th>IC50 Lower</th>
            <th>IC50 Upper</th>
            <th>pIC50</th>
            <th>Status</th>
            <th className="text-center" style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map(({ key, dataItem, sampleName, outputId }) => {
            const result = dataItem.result?.[0] || {};
            const isSelected = selectedAnalyses[key];

            return (
              <tr key={key} className={isSelected ? 'table-primary' : ''}>
                <td className="text-center">
                  <input
                    type="checkbox"
                    checked={isSelected || false}
                    onChange={() => onToggleSelection(key)}
                  />
                </td>
                <td className="fw-semibold">{sampleName}</td>
                <td className="text-center">
                  <div
                    className="border rounded bg-light d-flex align-items-center justify-content-center"
                    style={{
                      width: '80px',
                      height: '50px',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                    onClick={() => onShowDetails(dataItem, sampleName, outputId)}
                    title="Click to view full diagram"
                  >
                    <div style={{ transform: 'scale(0.15)', transformOrigin: 'center', width: '500px', height: '300px' }}>
                      <BoxPlotVisualization outputData={dataItem} />
                    </div>
                  </div>
                </td>
                <td>
                  {result.IC50_relative !== undefined ? result.IC50_relative.toFixed(4) : '-'}
                </td>
                <td>
                  {result.IC50_relative_lower !== undefined ? result.IC50_relative_lower.toFixed(4) : '-'}
                </td>
                <td>
                  {result.IC50_relative_higher !== undefined ? result.IC50_relative_higher.toFixed(4) : '-'}
                </td>
                <td>
                  {result.pIC50 !== undefined ? result.pIC50.toFixed(4) : '-'}
                </td>
                <td>
                  {result.Problems ? (
                    <Badge bg="warning" className="small">{result.Problems}</Badge>
                  ) : (
                    <Badge bg="success" className="small">OK</Badge>
                  )}
                </td>
                <td className="text-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => onShowDetails(dataItem, sampleName, outputId)}
                    className="me-1"
                    style={{ fontSize: '0.75rem' }}
                    title="View details"
                  >
                    <i className="fa fa-line-chart" />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => onDelete(outputId, sampleName)}
                    style={{ fontSize: '0.75rem' }}
                    title="Delete analysis"
                  >
                    <i className="fa fa-trash" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

MttResultsTable.propTypes = {
  analyses: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    dataItem: PropTypes.object.isRequired,
    sampleName: PropTypes.string.isRequired,
    outputId: PropTypes.number.isRequired
  })).isRequired,
  selectedAnalyses: PropTypes.objectOf(PropTypes.bool).isRequired,
  onToggleSelection: PropTypes.func.isRequired,
  onToggleSelectAll: PropTypes.func.isRequired,
  onShowDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default MttResultsTable;
