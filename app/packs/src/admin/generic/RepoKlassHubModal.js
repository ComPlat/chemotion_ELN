import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Modal, Button } from 'react-bootstrap';
import RepoKlassList from './RepoKlassList';

const data = [
  // {
  //     "label": "Sample",
  //     "desc": "ELN Sample",
  //     "released_at": "2021-08-06T21:25:07.881Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "sample",
  //     "icon_name": "icon-sample",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Reaction",
  //     "desc": "ELN Reaction",
  //     "released_at": "2021-08-06T21:25:07.908Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "reaction",
  //     "icon_name": "icon-reaction",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Wellplate",
  //     "desc": "ELN Wellplate",
  //     "released_at": "2021-08-06T21:25:07.914Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "wellplate",
  //     "icon_name": "icon-wellplate",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Screen",
  //     "desc": "ELN Screen",
  //     "released_at": "2021-08-06T21:25:07.920Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "screen",
  //     "icon_name": "icon-screen",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Research Plan",
  //     "desc": "ELN Research Plan",
  //     "released_at": "2021-08-06T21:25:07.926Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "research_plan",
  //     "icon_name": "icon-research_plan",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  //  },
  {
      "label": "SurMOF substrate",
      "desc": "SurMOF substrate",
      "released_at": "2022-07-13T21:40:40.927Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Sample",
          "desc": "ELN Sample",
          "released_at": "2021-08-06T21:25:07.881Z",
          "klass_object": "ElementKlass",
          "klass_name": "sample",
          "icon_name": "icon-sample",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "5370a5b9-926e-47ef-82f8-c7f1e3b5b166"
  },
  {
      "label": "MOF Segment",
      "desc": "MOF Segment",
      "released_at": "2022-07-13T21:45:07.363Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Sample",
          "desc": "ELN Sample",
          "released_at": "2021-08-06T21:25:07.881Z",
          "klass_object": "ElementKlass",
          "klass_name": "sample",
          "icon_name": "icon-sample",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "47e35bfb-f797-4e2c-88b8-46bb098c6ff4"
  },
  {
      "label": "SurMOF Reaction",
      "desc": "SurMOF reaction",
      "released_at": "2022-07-13T21:44:07.173Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Reaction",
          "desc": "ELN Reaction",
          "released_at": "2021-08-06T21:25:07.908Z",
          "klass_object": "ElementKlass",
          "klass_name": "reaction",
          "icon_name": "icon-reaction",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "58244213-b5aa-4b01-9b97-5a47149e57bf"
  },
  {
      "label": "MOF Reaction details",
      "desc": "MOF reaction details",
      "released_at": "2022-07-13T21:45:56.944Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Reaction",
          "desc": "ELN Reaction",
          "released_at": "2021-08-06T21:25:07.908Z",
          "klass_object": "ElementKlass",
          "klass_name": "reaction",
          "icon_name": "icon-reaction",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "f5b72c9b-2e0c-4124-96b2-9114e37f1512"
  }
];

export default class RepoKlassHubModal extends Component {
  constructor(props) {
    super(props);
  }

  handleCreate() {
    // const { fnCreate } = this.props;
    // const layer = {
    //   key: this.formRef.current.lf_layerKey.value.trim(),
    //   label: this.formRef.current.lf_label.value.trim(),
    //   cols: parseInt(this.formRef.current.lf_cols.value.trim() || 1, 10),
    //   position: parseInt(this.formRef.current.lf_position.value.trim() || 100, 10)
    // };
    // fnCreate(layer);
  }

  render() {
    const { showModal, fnClose } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>Generic Segment Templates</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <div>
              <RepoKlassList list={data} />
            </div>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

RepoKlassHubModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
};
