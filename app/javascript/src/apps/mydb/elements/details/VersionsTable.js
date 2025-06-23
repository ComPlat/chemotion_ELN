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
      perPage: 10,
      totalElements: 0,
      TableChangesId: -1,
      renderRevertView: false,
    };
  }

  componentDidMount() {
    this.fetchVersions();
  }

  handlePagerClick = (eventKey) => {
    this.setState({ TableChangesId: -1 });
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

  onSelectionChanged = ({ api }) => {
    const selectedRows = api.getSelectedRows();
    const {
      totalElements, pages, page, perPage
    } = this.state;
    const { versions } = this.state;
    if (selectedRows.length === 0) return;
    if (page === pages) {
      this.setState({ TableChangesId: versions.length - selectedRows[0].id, renderRevertView: false });
    } else {
      this.setState({
        TableChangesId: totalElements - (page - 1) * perPage - selectedRows[0].id,
        renderRevertView: false
      });
    }
    const selectedVersion = versions.find((version) => version.id === selectedRows[0].id);
    const updatedVersion = {
      ...selectedVersion,
      changes: selectedVersion.changes.map((change) => ({
        ...change,
        fields: change.fields.map((field) => ({
          ...field,
          previousValue: this.findLastDifferentValue(selectedVersion.id, field.label, field.newValue) ?? field.oldValue
        }))
      }))
    };
    const updatedVersions = versions.map((version) => (version.id === selectedRows[0].id ? updatedVersion : version));

    this.setState({ versions: updatedVersions });
  };

  toggleRevertView = () => this.setState((prevState) => ({ renderRevertView: !prevState.renderRevertView }));

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
        perPage: result.perPage || 10,
        totalElements: result.totalElements || 0,
      });
    });
  }

  deep_fill_missing(currentValue, changes) {
    if (typeof currentValue !== 'object' || currentValue === null || Array.isArray(currentValue)) {
      return null;
    }

    const result = {};
    Object.entries(currentValue).forEach(([key, expectedVal]) => {
      // Gather values for this key from all changes
      const candidateStack = Object.values(changes)
        .map((c) => (
          typeof c === 'object'
          && c !== null
          && !Array.isArray(c)
          && Object.prototype.hasOwnProperty.call(c, key) ? c[key] : undefined
        ))
        .filter((val) => val !== undefined);

      if (typeof expectedVal === 'object' && expectedVal !== null && !Array.isArray(expectedVal)) {
        const merged = this.deep_fill_missing(
          expectedVal,
          Object.fromEntries(candidateStack.map((val, i) => [i, val]))
        );
        if (merged != null && Object.keys(merged).length > 0) {
          result[key] = merged;
        }
      } else {
        const candidate = candidateStack.find((v) => v != null);
        if (candidate != null) {
          result[key] = candidate;
        }
      }
    });
    return result;
  }

  findLastDifferentValue(id, key, currentValue) {
    const { versions } = this.state;
    const changes = versions
      .filter((v) => v.id <= id)
      .sort((a, b) => b.id - a.id)
      .flatMap((v) => v.changes
        .flatMap((change) => change.fields
          .filter((f) => f.label === key)
          .map((f) => f.oldValue)));

    if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
      return this.deep_fill_missing(currentValue, changes) || {};
    }

    return null;
  }

  render() {
    const {
      versions, page, pages, TableChangesId, renderRevertView
    } = this.state;
    const { isEdited } = this.props;

    const pagination = () => (
      <Pagination>
        <Pagination.Item
          previous
          href="#"
          onClick={() => this.handlePagerClick('prev')}
          disabled={page >= pages}
        >
          &larr; Older versions
        </Pagination.Item>
        <Pagination.Item
          next
          href="#"
          onClick={() => this.handlePagerClick('next')}
          disabled={page <= 1}
        >
          Newer versions &rarr;
        </Pagination.Item>
      </Pagination>
    );

    const columns = [
      {
        field: 'id',
        headerName: '#',
        flex: 1,
      },
      {
        field: 'createdAt',
        headerName: 'Modified on',
        valueFormatter: (p) => moment(p.value).format('YYYY-MM-DD HH:mm:ss'),
        tooltipValueGetter: (p) => moment(p.value).fromNow(),
        flex: 3,
      },
      {
        field: 'userName',
        headerName: 'Author',
        flex: 3,
      },
      {
        field: 'changes',
        headerName: 'Changes',
        valueFormatter: (p) => p.value.map((c) => c.name).join(','),
        flex: 5,
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
            rowSelection="single"
            onSelectionChanged={this.onSelectionChanged}
          />
          {pagination()}
        </div>
        <VersionsTableChanges
          data={versions[TableChangesId]}
          handleRevert={this.handleRevert}
          isEdited={isEdited}
          renderRevertView={renderRevertView}
          toggleRevertView={this.toggleRevertView}
        />
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
