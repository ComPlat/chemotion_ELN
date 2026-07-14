import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Table, Badge } from 'react-bootstrap';
import { GenInterface } from 'chem-generic-ui';
import BoxPlotVisualization from 'src/components/generic/BoxPlotVisualization';
import { normalizeMttResult } from 'src/utilities/mttDataProcessor';

const fmt = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num.toFixed(4) : '';
};
const fmtExp = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num.toExponential(4) : '';
};

function MttAnalysisDetailsModal({
  show,
  onHide,
  analysisData,
  onDelete,
  generic
}) {
  if (!analysisData) {
    return null;
  }

  const { dataItem, sampleName, outputId } = analysisData;
  const result = normalizeMttResult(dataItem.result?.[0]);

  const genericEl = generic ? {
    ...generic,
    properties: {
      ...generic.properties,
      layers: {
        general_information: generic.properties?.layers?.general_information
      }
    }
  } : null;

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
          <GenInterface
            generic={genericEl}
            fnChange={() => {}}
            extLayers={[]}
            genId={genericEl.id || 0}
            isPreview={false}
            isActiveWF={false}
            fnNavi={() => {}}
            aiComp={null}
            expandAll={false}
            editMode={false}
          />
          <div style={{ overflowX: 'auto' }}>
            <Table bordered size="sm" className="bg-white">
              <thead className="bg-light">
                <tr>
                  <th>Name</th>
                  <th>{result.icLabel} (relative)</th>
                  <th>{result.icLabel} Lower</th>
                  <th>{result.icLabel} Upper</th>
                  <th>{result.picLabel}</th>
                  <th>Hill Coefficient</th>
                  <th>RSE</th>
                  <th>p-value</th>
                  <th>Asymptotes</th>
                  <th>Problems</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="fw-semibold">{result.name}</td>
                  <td>
                    {fmt(result.icRelative)}
                    {result.unit ? ` ${result.unit}` : ''}
                  </td>
                  <td>{fmt(result.icRelativeLower)}</td>
                  <td>{fmt(result.icRelativeHigher)}</td>
                  <td>{fmt(result.pIc)}</td>
                  <td>{fmt(result.HillCoefficient)}</td>
                  <td>{fmt(result.RSE)}</td>
                  <td className="small">{fmtExp(result.p_value)}</td>
                  <td className="small">
                    {fmt(result.asymptote_one)} / {fmt(result.asymptote_two)}
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
                      <td>{inp.conc}{inp.unit ? ` ${inp.unit}` : ''}</td>
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
  onDelete: PropTypes.func.isRequired,
  generic: PropTypes.object.isRequired
};

MttAnalysisDetailsModal.defaultProps = {
  analysisData: null
};

export default MttAnalysisDetailsModal;
