import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Badge, Table, Tab, Tabs } from 'react-bootstrap';

/**
 * Detail modal for viewing full analysis data
 */
const AnalysisDetailModal = ({ show, onHide, analysis }) => {
  if (!analysis) return null;

  const source = analysis._source || analysis;

  // Extract key fields
  const technique = source.techniques?.[0] || 'Unknown';
  const nucleus = source.nmr_nucleus || '';
  const frequency = source.nmr_frequency_mhz ? `${source.nmr_frequency_mhz} MHz` : '';
  const solvent = source.nmr_solvent || '';
  const searchText = source.search_text || '';
  const containerName = source.container_name || 'Analysis';
  const sampleName = source.sample_name || '';
  const sampleId = source.sample_id;
  const containerId = source.container_id || source.id;

  // Get peaks data
  const getPeaksData = () => {
    if (source.nmr_data?.peaks?.length > 0) {
      return {
        type: 'nmr',
        peaks: source.nmr_data.peaks
      };
    }
    if (source.ir_data?.peaks?.length > 0) {
      return {
        type: 'ir',
        peaks: source.ir_data.peaks
      };
    }
    if (source.ms_data?.peaks?.length > 0) {
      return {
        type: 'ms',
        peaks: source.ms_data.peaks
      };
    }
    return null;
  };

  const peaksData = getPeaksData();

  // Render NMR peaks table
  const renderNMRPeaksTable = (peaks) => (
    <Table striped bordered hover size="sm" className="mb-0">
      <thead>
        <tr>
          <th>δ (ppm)</th>
          <th>Multiplicity</th>
          <th>J (Hz)</th>
          <th>Integration</th>
        </tr>
      </thead>
      <tbody>
        {peaks.map((peak, index) => (
          <tr key={index}>
            <td>{peak.chemical_shift?.toFixed(2)}</td>
            <td>{peak.multiplicity || '—'}</td>
            <td>{peak.coupling_constants?.join(', ') || '—'}</td>
            <td>{peak.integration || '—'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  // Render IR peaks table
  const renderIRPeaksTable = (peaks) => (
    <Table striped bordered hover size="sm" className="mb-0">
      <thead>
        <tr>
          <th>Wavenumber (cm⁻¹)</th>
          <th>Intensity</th>
          <th>Assignment</th>
        </tr>
      </thead>
      <tbody>
        {peaks.map((peak, index) => (
          <tr key={index}>
            <td>{peak.wavenumber}</td>
            <td>{peak.intensity || '—'}</td>
            <td>{peak.assignment || '—'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  // Render MS peaks table
  const renderMSPeaksTable = (peaks) => (
    <Table striped bordered hover size="sm" className="mb-0">
      <thead>
        <tr>
          <th>m/z</th>
          <th>Intensity (%)</th>
          <th>Assignment</th>
        </tr>
      </thead>
      <tbody>
        {peaks.map((peak, index) => (
          <tr key={index}>
            <td>{peak.mz}</td>
            <td>{peak.intensity || '—'}</td>
            <td>{peak.assignment || '—'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  // Handle navigate to sample
  const handleNavigateToSample = () => {
    if (sampleId) {
      // Navigate to sample in ELN - this depends on your app's routing
      window.location.href = `/mydb/samples/${sampleId}`;
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="d-flex align-items-center">
          <Badge bg="primary" className="me-2 text-uppercase">{technique}</Badge>
          {nucleus && <Badge bg="info" className="me-2">{nucleus}</Badge>}
          <span>{containerName}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {/* Metadata */}
        <div className="mb-3 d-flex flex-wrap gap-3">
          {frequency && (
            <div>
              <small className="text-muted d-block">Frequency</small>
              <strong>{frequency}</strong>
            </div>
          )}
          {solvent && (
            <div>
              <small className="text-muted d-block">Solvent</small>
              <strong>{solvent}</strong>
            </div>
          )}
          {sampleName && (
            <div>
              <small className="text-muted d-block">Sample</small>
              <strong>{sampleName}</strong>
            </div>
          )}
        </div>

        <Tabs defaultActiveKey="text" className="mb-3">
          {/* Raw Text Tab */}
          <Tab eventKey="text" title="Raw Text">
            <pre
              className="bg-light p-3 rounded"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '300px',
                overflow: 'auto',
                fontSize: '0.9em'
              }}
            >
              {searchText || 'No text available'}
            </pre>
          </Tab>

          {/* Peaks Table Tab */}
          {peaksData && (
            <Tab eventKey="peaks" title={`Peaks (${peaksData.peaks.length})`}>
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {peaksData.type === 'nmr' && renderNMRPeaksTable(peaksData.peaks)}
                {peaksData.type === 'ir' && renderIRPeaksTable(peaksData.peaks)}
                {peaksData.type === 'ms' && renderMSPeaksTable(peaksData.peaks)}
              </div>
            </Tab>
          )}

          {/* JSON Tab */}
          <Tab eventKey="json" title="JSON">
            <pre
              className="bg-dark text-light p-3 rounded"
              style={{
                maxHeight: '400px',
                overflow: 'auto',
                fontSize: '0.8em'
              }}
            >
              {JSON.stringify(source, null, 2)}
            </pre>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer className="border-0">
        {sampleId && (
          <Button variant="outline-primary" onClick={handleNavigateToSample}>
            <i className="fa fa-flask me-1" />
            Go to Sample
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

AnalysisDetailModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  analysis: PropTypes.object
};

AnalysisDetailModal.defaultProps = {
  analysis: null
};

export default AnalysisDetailModal;
