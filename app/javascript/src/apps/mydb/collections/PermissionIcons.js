import React from 'react';
import PropTypes from 'prop-types';
import { PermissionConst } from 'src/utilities/PermissionConst';

// The ladder is cumulative, so every rung at or below `pl` gets an icon.
const RUNGS = [
  { level: PermissionConst.EditElements, icon: 'fa-pencil-square-o', title: 'Edit elements' },
  { level: PermissionConst.AddElements, icon: 'fa-plus-square-o', title: 'Add elements' },
  { level: PermissionConst.RemoveElements, icon: 'fa-trash', title: 'Remove elements' },
  { level: PermissionConst.ManageShares, icon: 'fa-users', title: 'Manage shares' },
  { level: PermissionConst.PassOwnership, icon: 'fa-exchange', title: 'Pass ownership' },
];

const PermissionIcons = ({ pl }) => {
  if (pl < PermissionConst.ReadElements) return null;

  return (
    <>
      <i className="fa fa-newspaper-o" title="Read elements" />
      {RUNGS.filter((rung) => pl >= rung.level).map((rung) => (
        <i key={rung.icon} className={`fa ${rung.icon}`} title={rung.title} />
      ))}
    </>
  );
};

PermissionIcons.propTypes = {
  pl: PropTypes.number.isRequired,
};

export default PermissionIcons;
