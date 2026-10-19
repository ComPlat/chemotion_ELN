import { allElnElementsForSearch } from 'src/apps/generic/Utils';
import { dateToUnixTimestamp } from 'src/utilities/timezoneHelper';

// The element list's active filter chips as the search API takes them; {} when none is active.
const listFilterParams = ({
  filterCreatedAt, fromDate, toDate, userLabel, productOnly
}) => {
  if (!userLabel && !fromDate && !toDate && !productOnly) return {};

  return {
    filter_created_at: filterCreatedAt,
    from_date: fromDate ? dateToUnixTimestamp(fromDate) : null,
    to_date: toDate ? dateToUnixTimestamp(toDate) : null,
    user_label: userLabel,
    product_only: productOnly,
  };
};

// id_params naming for /search/by_ids, from a singular element type such as 'sample' or a generic klass name.
const byIdsModelParams = (type) => {
  if (type === 'cell_line') return { model_name: 'cell_lines' };
  if (allElnElementsForSearch.includes(`${type}s`)) return { model_name: type };
  return { model_name: 'element', element_klass: type };
};

export { listFilterParams, byIdsModelParams };
