import React, { Component } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { PredictionHelp, PredictionToolbar } from './PredictionUI';

import PredictionTemplateFetcher from 'src/fetchers/PredictionTemplateFetcher';
const styles = {
    image: {
      maxWidth: '100%',
      maxHeight: '300px',
      marginBottom: '16px',
      padding: '10px'
    },
    info: {
      fontSize: '16px',
      marginBottom: '8px',
      padding: '10px'

    },
    references: {
      fontSize: '14px',
      marginBottom: '16px',
      padding: '10px'

    },
    referenceTable: {
      width: '100%',
      borderCollapse: 'collapse',

    },
    referenceHeader: {
      backgroundColor: '#f2f2f2',
      textAlign: 'left',
    },
    referenceRow: {
      borderBottom: '1px solid #ccc',
    },
    referenceCell: {
      padding: '8px',
    },
  };
class TemplateContainer extends Component {
  constructor(props) {
    super(props);
    this.initialstate = {
      templateId: '',
      apiResponse: null,
    };
    this.state = this.initialstate;
  }

  handleTemplateIdChange = (event) => {
    this.setState({ templateId: event.target.value });
  };

  fetchApiResponse = () => {
    // Replace 'YOUR_API_ENDPOINT' with the actual API endpoint to fetch the response based on the template ID.
    const params = { template_id: this.state.templateId };

    PredictionTemplateFetcher.fetchtemplate(params)
      .then((response) => {
        // Update the state with the API response data.
        this.setState({ apiResponse: response });
        console.log(response);
        console.log(this.state);
      })
      .catch((error) => {
        console.error('Error fetching API response:', error);
      });
  };

  render() {
    const { apiResponse } = this.state;
    const clickToReset = () => {
      this.state = this.initialstate;
    };

    return (
        <div className='tmp-container'>
          <PredictionHelp>
            Search for reaction templates in the Reaxys database by template ID. A template ID can be obtained from
            the Retrosynthesis tab by clicking a reaction node.
          </PredictionHelp>
        <PredictionToolbar>
          <InputGroup size="sm" className="w-auto">
            <Form.Control
              type="text"
              value={this.state.templateId}
              onChange={this.handleTemplateIdChange}
              placeholder="Enter Template ID"
            />
            <Button variant="primary" onClick={this.fetchApiResponse}>
              <i className="fa fa-search me-1" aria-hidden="true" />
              Fetch Reaction Template
            </Button>
          </InputGroup>
          <Button variant="outline-secondary" size="sm" className="ms-auto" onClick={clickToReset}>
            <i className="fa fa-eraser me-1" aria-hidden="true" />
            Reset
          </Button>
        </PredictionToolbar>
        {apiResponse && (
          <>
            <img
              style={styles.image}
              src={`data:image/png;base64,${apiResponse.template.svg}`}
              alt="SVG"
            />
            <>
            Reaction Smarts: {apiResponse.template.reaction_smarts && <p style={styles.info}>{apiResponse.template.reaction_smarts}</p>}
            </>
            Template Set: {apiResponse.template.template_set && <p style={styles.info}>{apiResponse.template.template_set}</p>}
            {apiResponse.template.references && (
              <div style={styles.references}>
                <p style={styles.info}>References:</p>
                <table style={styles.referenceTable}>
                  <tbody>
                    {apiResponse.template.references.map((reference, index) => (
                      <tr key={index} style={styles.referenceRow}>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                        <td style={styles.referenceCell}>{reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

export default TemplateContainer;
