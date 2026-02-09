import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Table, Badge } from 'react-bootstrap';
import BoxPlotVisualization from 'src/components/generic/BoxPlotVisualization';

function MttAnalysisDetailsModal({
  show,
  onHide,
  analysisData,
  onDelete
}) {
  if (!analysisData) {
    return null;
  }

  const { dataItem, sampleName, outputId } = analysisData;
  const result = dataItem.result?.[0] || {};

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>{sampleName} - Analysis Details</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* BoxPlot Visualization */}
        <div className="mb-4 p-3 bg-light border rounded">
          <h6 className="text-primary mb-3">Dose-Response Visualization</h6>
          <BoxPlotVisualization outputData={dataItem} />
        </div>

        {/* Full Results Table */}
        <div className="mb-4">
          <h6 className="text-primary mb-2">Results</h6>
          <div style={{ overflowX: 'auto' }}>
            <Table bordered size="sm" className="bg-white">
              <thead className="bg-light">
                <tr>
                  <th>Name</th>
                  <th>IC50 (relative)</th>
                  <th>pIC50</th>
                  <th>Hill Coefficient</th>
                  <th>RSE</th>
                  <th>p-value</th>
                  <th>IC50 Range</th>
                  <th>Asymptotes</th>
                  <th>Problems</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="fw-semibold">{result.name}</td>
                  <td>{result.IC50_relative?.toFixed(4)}</td>
                  <td>{result.pIC50?.toFixed(4)}</td>
                  <td>{result.HillCoefficient?.toFixed(4)}</td>
                  <td>{result.RSE?.toFixed(4)}</td>
                  <td className="small">{result.p_value?.toExponential(4)}</td>
                  <td className="small">
                    {result.IC50_relative_lower?.toFixed(2)} - {result.IC50_relative_higher?.toFixed(2)}
                  </td>
                  <td className="small">
                    {result.asymptote_one?.toFixed(4)} / {result.asymptote_two?.toFixed(4)}
                  </td>
                  <td>
                    {result.Problems ? (
                      <Badge bg="warning">{result.Problems}</Badge>
                    ) : (
                      <span className="text-success">✓</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>
        </div>

        {/* Input Data Summary */}
        {dataItem.input && dataItem.input.length > 0 && (
          <div>
            <h6 className="text-primary mb-2">Input Data Summary</h6>
            <div style={{ overflowX: 'auto' }}>
              <Table bordered size="sm" className="bg-white">
                <thead className="bg-light">
                  <tr>
                    <th>Name</th>
                    <th>Concentration</th>
                    <th>Values</th>
                    <th>Well ID</th>
                    <th>Sample ID</th>
                    <th>Wellplate ID</th>
                  </tr>
                </thead>
                <tbody>
                  {dataItem.input.map((inp, inpIdx) => (
                    <tr key={inpIdx}>
                      <td>{inp.name}</td>
                      <td>{inp.conc}</td>
                      <td className="fw-semibold">{inp.values}</td>
                      <td className="font-monospace small">{inp.well_id}</td>
                      <td className="font-monospace small">{inp.sample_id}</td>
                      <td>{inp.wellplate_id}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-danger"
          size="sm"
          onClick={() => onDelete(outputId, sampleName)}
        >
          <i className="fa fa-trash" /> Delete Analysis
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onHide}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

MttAnalysisDetailsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  analysisData: PropTypes.shape({
    dataItem: PropTypes.object.isRequired,
    sampleName: PropTypes.string.isRequired,
    outputId: PropTypes.number.isRequired
  }),
  onDelete: PropTypes.func.isRequired
};

MttAnalysisDetailsModal.defaultProps = {
  analysisData: null
};

export default MttAnalysisDetailsModal;
