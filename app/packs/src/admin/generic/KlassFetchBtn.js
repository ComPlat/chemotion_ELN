import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Modal, Button } from 'react-bootstrap';
import GenericSgsFetcher from '../../components/fetchers/GenericSgsFetcher';
import RepoKlassList from './RepoKlassList';
import KlassSyncBtn from './KlassSyncBtn';

const elementKlassFormat = params => params.value.label;
const colDefs = {
  ElementKlass: [
    { field: 'klass_name', headerName: 'Name', sort: 'asc' },
    { field: 'label', headerName: 'Element Label' },
    { field: 'desc', headerName: 'Description' },
    { field: 'released_at', headerName: 'Released at', sortable: false }
  ],
  SegmentKlass: [
    {
      field: 'label', headerName: 'Segment Label', sort: 'asc', cellRenderer: KlassSyncBtn
    },
    { field: 'desc', headerName: 'Description' },
    { field: 'released_at', headerName: 'Released at', sortable: false },
    { field: 'element_klass', headerName: 'Belongs to', valueFormatter: elementKlassFormat },
    { field: 'identifier', editable: true, sortable: false }
  ],
  DatasetKlass: [
    { field: 'label', headerName: 'Chemical Methods Ontology', sort: 'asc' },
    { field: 'released_at', headerName: 'Released at', sortable: false }
  ]
};

export default class KlassFetchBtn extends Component {
  constructor(props) {
    super(props);
    this.state = { show: false, data: [] };
    this.handleShow = this.handleShow.bind(this);
  }

  handleShow() {
    GenericSgsFetcher.fetchRepoKlassList().then((result) => {
      console.log(result);
      this.setState({ show: true, data: result.klass });
    }).catch((error) => {
      console.log(error);
    });
  }

  render() {
    const { show, data } = this.state;
    return (
      <span>
        <Button bsStyle="primary" bsSize="small" onClick={() => this.handleShow()}>
          Fetch from Chemotion Repository&nbsp;<i className="fa fa-reply" aria-hidden="true" />
        </Button>
        <Modal animation dialogClassName="template_modal_60w" show={show} onHide={() => this.setState({ show: false })}>
          <Modal.Header closeButton><Modal.Title>Generic Segment Templates</Modal.Title></Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            <div className="col-md-12">
              <div>
                <RepoKlassList list={data} cols={colDefs.SegmentKlass} />
              </div>
            </div>
          </Modal.Body>
        </Modal>
      </span>
    );
  }
}
