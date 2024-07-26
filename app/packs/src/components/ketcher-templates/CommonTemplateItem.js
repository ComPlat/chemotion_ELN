import { uniqueId } from 'lodash';
import React from 'react';

function CommonTemplateItem(props) {
  const { item, onClickItem } = props;
  let iconPath = '/images/ketcherails/icons/small/';
  if (item?.icon) iconPath += item?.icon.split('/')[3];
  return (
    <div className="ketcher-template-item" onClick={() => onClickItem(item)}>
      <img key={uniqueId("afasfasf")} src={iconPath} height={80} alt={item?.name} />
      <h4 style={{ marginLeft: 15 }}>
        {' '}
        {item?.name}
        {' '}
      </h4>
    </div>
  );
}

export default CommonTemplateItem;
