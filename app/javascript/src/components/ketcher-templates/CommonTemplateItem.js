import PropTypes from 'prop-types';
import React from 'react';

function CommonTemplateItem(props) {
  const { item, onClickItem } = props;
  return (
    <div className="ketcher-template-item" onClick={() => onClickItem(item)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="css-uwwqev"><path d="M8.75 3.75h-5v5h1.5V6.312L9 10.063l1-1.124L6.312 5.25H8.75v-1.5zM15.25 3.75h5v5h-1.5V6.312L15 10.063l-1-1.124 3.688-3.688H15.25v-1.5zM15.25 20.25h5v-5h-1.5v2.438L15 13.938l-1 1.124 3.688 3.688H15.25v1.5zM8.75 20.25h-5v-5h1.5v2.438L9 13.938l1 1.124-3.688 3.688H8.75v1.5z" fill="currentColor"></path></svg>
      <h4 style={{ marginLeft: 15 }}>
        {item?.name}
      </h4>
    </div>
  );
}

export default CommonTemplateItem;

CommonTemplateItem.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  item: PropTypes.object.isRequired,
  onClickItem: PropTypes.func.isRequired
};
