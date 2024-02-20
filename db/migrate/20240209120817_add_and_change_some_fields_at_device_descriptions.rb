class AddAndChangeSomeFieldsAtDeviceDescriptions < ActiveRecord::Migration[6.1]
  def up
    add_column :device_descriptions, :vendor_device_name, :string
    add_column :device_descriptions, :vendor_device_id, :string
    add_column :device_descriptions, :vendor_company_name, :string
    add_column :device_descriptions, :tags, :string
    add_column :device_descriptions, :policies_and_user_information, :text
    add_column :device_descriptions, :version_number, :string
    add_column :device_descriptions, :version_characterization, :text
    add_column :device_descriptions, :deleted_at, :datetime
    add_column :device_descriptions, :created_by, :integer

    rename_column :device_descriptions, :description_and_comments, :description
    rename_column :device_descriptions, :installation_start_date, :version_installation_start_date
    rename_column :device_descriptions, :installation_end_date, :version_installation_end_date
    rename_column :device_descriptions, :doi, :version_doi
    rename_column :device_descriptions, :doi_url, :version_doi_url
    rename_column :device_descriptions, :technical_operator, :operators

    remove_column :device_descriptions, :vendor_name
    remove_column :device_descriptions, :administrative_operator

    User.all.each do |user|
      user.counters['device_descriptions']="0"
      user.update_column(:counters, user.counters)
    end

    Profile.all.each do |profile|
      next unless profile.data['layout']
      next if profile.data['layout']['device_description']

      profile.data['layout']['device_description']=-1100
      profile.save
    end
  end

  def down
    remove_column :device_descriptions, :vendor_device_name
    remove_column :device_descriptions, :vendor_device_id
    remove_column :device_descriptions, :vendor_company_name
    remove_column :device_descriptions, :tags
    remove_column :device_descriptions, :policies_and_user_information
    remove_column :device_descriptions, :version_number
    remove_column :device_descriptions, :version_characterization
    remove_column :device_descriptions, :deleted_at
    remove_column :device_descriptions, :created_by

    rename_column :device_descriptions, :description, :description_and_comments
    rename_column :device_descriptions, :version_installation_start_date, :installation_start_date
    rename_column :device_descriptions, :version_installation_end_date, :installation_end_date
    rename_column :device_descriptions, :version_doi, :doi
    rename_column :device_descriptions, :version_doi_url, :doi_url
    rename_column :device_descriptions, :operators, :technical_operator

    add_column :device_descriptions, :vendor_name, :string
    add_column :device_descriptions, :administrative_operator, :jsonb

    User.all.each do |user|
      user.counters.delete('device_descriptions')
      user.update_column(:counters, user.counters)
    end

    Profile.all.each do |profile|
      next unless profile.data['layout']
      next unless profile.data['layout']['device_description']

      profile.data['layout'].delete('device_description')
      profile.save
    end
  end
end
