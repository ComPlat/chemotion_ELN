/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Pager } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import VersionsFetcher from 'src/fetchers/VersionsFetcher';
import VersionsTableTime from 'src/apps/mydb/elements/details/VersionsTableTime';
import VersionsTableChanges from 'src/apps/mydb/elements/details/VersionsTableChanges';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

export class VersionsTable extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

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
    const { versions } = this.state;
    const { VersioningStore } = this.context;
    const entityType = type.slice(0, -1);

    if (entityType === 'sample') {
      SamplesFetcher.fetchById(id).then((result) => {
        parent.setState({ sample: result });
      });
    }

    VersioningStore.updateVersions(JSON.stringify(versions));

    if (entityType === 'reaction') {
      DetailActions.close(element, true);
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
    const { VersioningStore } = this.context;
    VersioningStore.updateVersions(JSON.stringify(versions));

    const pagination = () => (
      <Pager>
        <Pager.Item
          previous
          href="#"
          onClick={() => this.handlePagerClick('prev')}
          disabled={page >= pages}
        >
          &larr; Older Versions
        </Pager.Item>
        <Pager.Item
          next
          href="#"
          onClick={() => this.handlePagerClick('next')}
          disabled={page <= 1}
        >
          Newer Versions &rarr;
        </Pager.Item>
      </Pager>
    );

    const columns = [
      {
        dataField: 'caret',
        text: '',
        isDummyField: true,
        // eslint-disable-next-line react/no-unstable-nested-components
        formatter: () => <i className="fa fa-caret-right history-table__caret" />,
      },
      {
        dataField: 'id',
        text: '#',
      },
      {
        dataField: 'createdAt',
        text: 'Modified on',
        // eslint-disable-next-line react/no-unstable-nested-components
        formatter: (cell) => (
          <VersionsTableTime dateTime={cell} />
        ),
      },
      {
        dataField: 'userName',
        text: 'Author',
      },
    ];

    const expandRow = {
      onlyOneExpanding: true,
      parentClassName: 'active',
      renderer: (row) => (
        <VersionsTableChanges
          id={row.id}
          changes={row.changes}
          handleRevert={this.handleRevert}
        />
      ),
    };

    return (
      <>
        <style>
          {`
            .reset-expansion-style {
              background: white;
            }
          `}
        </style>
        <ul className="history-legend">
          <li className="history-legend__item history-legend__item--old">before</li>
          <li className="history-legend__item history-legend__item--new">after</li>
          <li className="history-legend__item history-legend__item--current">current value</li>
        </ul>
        <BootstrapTable
          keyField="id"
          data={JSON.parse(VersioningStore.versions)}
          columns={columns}
          expandRow={expandRow}
          hover
          wrapperClasses="history-table"
          rowClasses="history-table__row"
        />
        {pagination()}
      </>
    );
  }
}

export default observer(VersionsTable);

VersionsTable.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  element: PropTypes.object.isRequired,
  parent: PropTypes.object.isRequired,
};
