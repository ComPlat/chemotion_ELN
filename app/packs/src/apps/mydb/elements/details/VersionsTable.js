/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Pagination } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import VersionsFetcher from 'src/fetchers/VersionsFetcher';
import VersionsTableChanges from 'src/apps/mydb/elements/details/VersionsTableChanges';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import ScreensFetcher from 'src/fetchers/ScreensFetcher';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import moment from 'moment';

export default class VersionsTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      versions: [],
      page: 1,
      pages: 1,
    };
  }

  componentDidMount() {
    this.fetchVersions();
  }

  handlePagerClick = (eventKey) => {
    if (eventKey === 'prev') {
      this.setState((state) => ({
        page: state.page + 1
      }), this.fetchVersions);
    } else {
      this.setState((state) => ({
        page: state.page - 1
      }), this.fetchVersions);
    }
  };

  reloadEntity = () => {
    const {
      id, type, element, parent
    } = this.props;
    const entityType = type.slice(0, -1);

    switch (entityType) {
      case 'sample': {
        SamplesFetcher.fetchById(id).then((result) => {
          parent.setState({ sample: result });
        });
        break;
      }
      case 'reaction': {
        DetailActions.close(element, true);
        break;
      }
      case 'research_plan': {
        ResearchPlansFetcher.fetchById(id).then((result) => {
          parent.setState({ researchPlan: result });
        });
        break;
      }
      case 'screen': {
        ScreensFetcher.fetchById(id).then((result) => {
          parent.setState({ screen: result });
        });
        break;
      }
      case 'wellplate': {
        WellplatesFetcher.fetchById(id).then((result) => {
          parent.setState({ wellplate: result });
        });
        break;
      }
      default:
        // do nothing
    }

    elementShowOrNew({
      type: entityType,
      params: { [`${entityType}ID`]: id }
    });
  };

  handleRevert = (changes) => VersionsFetcher.revert(changes)
    .then(() => this.fetchVersions())
    .then(() => this.reloadEntity());

  fetchVersions() {
    const { type, id } = this.props;
    const { page } = this.state;

    return VersionsFetcher.fetch({
      type, id, page
    }).then((result) => {
      if (!result) return false;

      return this.setState({
        versions: result.elements || [],
        page: result.page || 1,
        pages: result.pages || 1,
      });
    });
  }

  render() {
    const { versions, page, pages } = this.state;
    const { isEdited } = this.props;

    const pagination = () => (
      <Pagination>
        <Pagination.Item
          previous
          href="#"
          onClick={() => this.handlePagerClick('prev')}
          disabled={page >= pages}
        >
          &larr; Older Versions
        </Pagination.Item>
        <Pagination.Item
          next
          href="#"
          onClick={() => this.handlePagerClick('next')}
          disabled={page <= 1}
        >
          Newer Versions &rarr;
        </Pagination.Item>
      </Pagination>
    );

    const columns = [
      {
        field: 'details',
        headerName: 'double click in cell',
        cellEditor: VersionsTableChanges,
        cellEditorParams: {
          handleRevert: this.handleRevert,
          isEdited
        },
        cellEditorPopup: true,
        editable: true,
      },
      {
        field: 'id',
        headerName: '#',
      },
      {
        field: 'createdAt',
        headerName: 'Modified on',
        valueFormatter: (p) => moment(p.value).format('YYYY-MM-DD HH:mm:ss'),
        tooltipValueGetter: (p) => moment(p.value).fromNow(),
      },
      {
        field: 'userName',
        headerName: 'Author',
      },
    ];

    return (
      <>
        <style>
          {`
            .reset-expansion-style {
              background: white;
            }
          `}
        </style>
        <div className="ag-theme-balham">
          <AgGridReact
            columnDefs={columns}
            rowData={versions}
            domLayout="autoHeight"
            tooltipShowDelay="500"
          />
          {pagination()}
        </div>
      </>
    );
  }
}

VersionsTable.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  element: PropTypes.object.isRequired,
  parent: PropTypes.object.isRequired,
  isEdited: PropTypes.bool.isRequired,
};
