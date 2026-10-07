/*
Sorting for the grid's custom column headers.

AG Grid wires click-to-sort and the sort arrow into its own default header only; a column that brings
its own header component - and here every movable one does - has to ask for the sort itself and draw
the indicator. Both halves of the grid use this, so it sits in a module of its own rather than in
either of them.
*/
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const SORT_ICONS = {
  asc: 'fa-sort-asc',
  desc: 'fa-sort-desc',
};

/*
The sort of one column, kept in step with the grid. The column is the event source rather than the
grid api, so a header only re-renders when its own sort changes.
*/
const useColumnSort = (column, enableSorting) => {
  const [sort, setSort] = useState(null);

  useEffect(() => {
    if (!column || !enableSorting) {
      return undefined;
    }

    const onSortChanged = () => setSort(column.getSort() ?? null);
    onSortChanged();
    column.addEventListener('sortChanged', onSortChanged);

    return () => column.removeEventListener('sortChanged', onSortChanged);
  }, [column, enableSorting]);

  return sort;
};

/*
What a click on the header does next, said in its title: clicks go ascending, descending, and then
back to no sort at all - where the rows are in their own order, the one they were dragged into, which
can look like a shuffle after a sorted view.
*/
const sortTitle = (displayName, sort) => {
  switch (sort) {
    case 'asc':
      return `Sorted by ${displayName}, ascending. Click to sort descending.`;
    case 'desc':
      return `Sorted by ${displayName}, descending. Click to remove the sort: the variations go back `
        + 'to their own order, the one they were added or dragged into.';
    default:
      return `Click to sort by ${displayName}, ascending. Shift-click adds it to the current sort.`;
  }
};

/*
The column name, clickable when the column sorts. Shift-click adds the column to the sort instead of
replacing it, which is what AG Grid's own header does with `progressSort`.

A column that explains itself passes `description` (through `headerComponentParams`), which leads the
title: a `headerTooltip` would show as a second tooltip next to it.
*/
const SortableHeaderName = ({
  displayName, column, enableSorting, progressSort, description
}) => {
  const sort = useColumnSort(column, enableSorting);

  if (!enableSorting) {
    return <span className="text-truncate" title={description ?? undefined}>{displayName}</span>;
  }

  return (
    <button
      type="button"
      className="variations-sort-header text-truncate"
      title={[description, sortTitle(displayName, sort)].filter(Boolean).join('\n')}
      onClick={(event) => progressSort(event.shiftKey)}
    >
      <span className="text-truncate">{displayName}</span>
      <i
        className={`fa ${SORT_ICONS[sort] ?? 'fa-sort variations-sort-header__idle'} ms-1`}
        aria-hidden="true"
      />
    </button>
  );
};

SortableHeaderName.propTypes = {
  displayName: PropTypes.string.isRequired,
  // AG Grid's Column, handed to every header component.
  // eslint-disable-next-line react/forbid-prop-types
  column: PropTypes.object,
  enableSorting: PropTypes.bool,
  progressSort: PropTypes.func,
  description: PropTypes.string,
};

SortableHeaderName.defaultProps = {
  column: null,
  enableSorting: false,
  progressSort: () => {},
  description: null,
};

export default SortableHeaderName;
export { SortableHeaderName, sortTitle, useColumnSort };
