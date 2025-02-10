class CreateDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    create_table :device_descriptions do |t|
      t.integer :device_id
      t.string :name
      t.string :short_label
      t.string :vendor_name
      t.string :vendor_id
      t.string :vendor_url
      t.string :serial_number
      t.string :doi
      t.string :doi_url
      t.string :device_type
      t.string :device_type_detail
      t.string :operation_mode
      t.datetime :installation_start_date
      t.datetime :installation_end_date
      t.text :description_and_comments
      t.jsonb :technical_operator
      t.jsonb :administrative_operator
      t.string :university_campus
      t.string :institute
      t.string :building
      t.string :room
      t.string :infrastructure_assignment
      t.string :access_options
      t.string :comments
      t.string :size
      t.string :weight
      t.string :application_name
      t.string :application_version
      t.text :description_for_methods_part

      t.timestamps
    end
    add_index :device_descriptions, :device_id
  end
end
