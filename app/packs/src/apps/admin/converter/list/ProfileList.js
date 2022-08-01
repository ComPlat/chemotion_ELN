import React from 'react';
import { Panel, Table } from 'react-bootstrap';
import ProfileListItem from 'src/apps/admin/converter/list/ProfileListItem';

const ProfileList = (props) => {
  const {
    // eslint-disable-next-line react/prop-types
    profiles, deleteProfile, editProfile, downloadProfile
  } = props;

  const tcolumn = (
    <tr style={{ height: '26px', verticalAlign: 'middle' }}>
      <th width="5%">Action</th>
      <th width="10%">Title</th>
      <th width="10%">Description</th>
      <th width="10%">Data Type (Table 0)</th>
      <th width="10%">Data Class (Table 0)</th>
      <th width="10%">X Unit (Table 0)</th>
      <th width="10%">Y Unit (Table 0)</th>
      <th width="15%">ID</th>
    </tr>
  );

  return (
    <Panel>
      <Panel.Heading>
        <Table responsive hover bordered>
          <thead>
            {tcolumn}
          </thead>
          <tbody>
            {
              // eslint-disable-next-line react/prop-types
              profiles && profiles.map((profile, index) => (
                <ProfileListItem
                  key={profile.id}
                  id={profile.id}
                  title={profile.title}
                  description={profile.description}
                  profile={profile}
                  deleteProfile={() => deleteProfile(index, profile.id)}
                  editProfile={() => editProfile(index, profile.id)}
                  downloadProfile={() => downloadProfile(index, profile.id)}
                />
              ))
            }
          </tbody>
        </Table>
      </Panel.Heading>
    </Panel>
  );
};

export default ProfileList;
