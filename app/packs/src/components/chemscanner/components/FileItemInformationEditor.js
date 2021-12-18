import PropTypes from 'prop-types';
import React from 'react';
import { ControlLabel, FormControl, Panel, Radio } from 'react-bootstrap';

import PreviewFileZoomPan from './PreviewFileZoomPan';

const PreviewEditor = ({ imageData, fileName }) => {
  if (!imageData) return <span />;

  return (
    <Panel style={{ marginBottom: '0px', minHeight: '400px' }}>
      <Panel.Heading>{fileName}</Panel.Heading>
      <Panel.Body>
        <PreviewFileZoomPan
          imageURL={imageData}
          duration={200}
        />
      </Panel.Body>
    </Panel>
  );
};

PreviewEditor.propTypes = {
  imageData: PropTypes.string,
  fileName: PropTypes.string.isRequired,
};

PreviewEditor.defaultProps = {
  imageData: '',
};

const InfoEditor = ({ fileName, data }) => {
  const {
    domain, type, format, doi
  } = data;

  return (
    <Panel style={{ marginBottom: '0px' }}>
      <Panel.Heading>{fileName}</Panel.Heading>
      <Panel.Body>
        <table className="cs-extended-metadata-table">
          <tbody>
            <tr>
              <td style={{ width: '55px' }}>
                <ControlLabel>Domain</ControlLabel>
              </td>
              <td>
                <Radio
                  name="domainGroup"
                  defaultValue="organic"
                  defaultChecked={domain === 'organic'}
                >
                  Organic
                </Radio>
              </td>
              <td>
                <Radio
                  name="domainGroup"
                  defaultValue="inorganic"
                  defaultChecked={domain === 'inorganic'}
                >
                  Inorganic
                </Radio>
              </td>
              <td>
                <Radio
                  name="domainGroup"
                  defaultValue="solidPhase"
                  defaultChecked={domain === 'solidPhase'}
                >
                  Solid Phase
                </Radio>
              </td>
              <td>
                <Radio
                  name="domainGroup"
                  defaultValue="heteroCyclic"
                  defaultChecked={domain === 'heteroCyclic'}
                >
                  Hetero cyclic
                </Radio>
              </td>
            </tr>
            <tr>
              <td>
                <ControlLabel>Type</ControlLabel>
              </td>
              <td>
                <Radio
                  name="typeGroup"
                  defaultValue="published"
                  defaultChecked={type === 'published'}
                >
                  Published
                </Radio>
              </td>
              <td>
                <Radio
                  name="typeGroup"
                  defaultValue="unpublished"
                  defaultChecked={type === 'unpublished'}
                >
                  Never published
                </Radio>
              </td>
            </tr>
            <tr>
              <td>
                <ControlLabel>Format</ControlLabel>
              </td>
              <td>
                <Radio
                  name="formatGroup"
                  defaultValue="supportingInformation"
                  defaultChecked={format === 'supportingInformation'}
                >
                  Supporting Information
                </Radio>
              </td>
              <td>
                <Radio
                  name="formatGroup"
                  defaultValue="manuscript"
                  defaultChecked={format === 'manuscript'}
                >
                  Manuscript
                </Radio>
              </td>
              <td>
                <Radio
                  name="formatGroup"
                  defaultValue="review"
                  defaultChecked={format === 'review'}
                >
                  Review
                </Radio>
              </td>
              <td>
                <Radio
                  name="formatGroup"
                  defaultValue="report"
                  defaultChecked={format === 'report'}
                >
                  Report
                </Radio>
              </td>
            </tr>
            <tr>
              <td>
                <ControlLabel>DOI</ControlLabel>
              </td>
              <td colSpan={4}>
                <FormControl
                  type="text"
                  id="doi_info"
                  defaultValue={doi || ''}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Panel.Body>
    </Panel>
  );
};

InfoEditor.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
  fileName: PropTypes.string.isRequired,
};

export default class FileItemInformationEditor extends React.Component {
  constructor(props) {
    super(props);

    this.containerRef = React.createRef();

    this.focus = this.focus.bind(this);
  }

  componentDidMount() {
    this.focus();
  }

  componentDidUpdate() {
    this.focus();
  }

  componentWillUnmount() {
    const { type, data } = this.props.node;

    const extData = data.extendedMetadata || {};

    let query = 'input[name="domainGroup"]:checked';
    const domain = this.containerRef.current.querySelector(query);
    if (domain) {
      extData.domain = domain.value;
    } else {
      delete extData.domain;
    }

    query = 'input[name="typeGroup"]:checked';
    const typeInfo = this.containerRef.current.querySelector(query);
    if (typeInfo) {
      extData.type = typeInfo.value;
    } else {
      delete extData.type;
    }

    query = 'input[name="formatGroup"]:checked';
    const format = this.containerRef.current.querySelector(query);
    if (format) {
      extData.format = format.value;
    } else {
      delete extData.format;
    }

    const doi = this.containerRef.current.querySelector('#doi_info');
    if (doi) {
      extData.doi = doi.value;
    } else {
      delete extData.doi;
    }

    data.extendedMetadata = extData;
    this.props.doneEditing(type, data);
  }

  getValue() {
    return this.props.node.data.type;
  }

  focus() {
    if (this.containerRef.current) this.containerRef.current.focus();
  }

  // eslint-disable-next-line class-methods-use-this
  isPopup() {
    return true;
  }

  render() {
    const { type } = this.props;
    const { data } = this.props.node;
    const { fileName, imageData, extendedMetadata } = data;

    let editor = <span />;
    if (type === 'preview') {
      editor = <PreviewEditor imageData={imageData} fileName={fileName} />;
    } else if (type === 'info') {
      editor = <InfoEditor data={extendedMetadata} fileName={fileName} />;
    }

    return (
      <div ref={this.containerRef}>
        {editor}
      </div>
    );
  }
}

FileItemInformationEditor.propTypes = {
  type: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  doneEditing: PropTypes.func.isRequired
};
