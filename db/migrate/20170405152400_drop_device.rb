class DropDevice < ActiveRecord::Migration[4.2]
    def change
      drop_table :devices if table_exists? :devices
      drop_table :devices_analyses if table_exists? :devices_analyses
      drop_table :devices_samples if table_exists? :devices_samples
    end

    remove_index "devices_samples", ["device_id"] if index_exists? "devices_samples", ["device_id"]
    remove_index "devices_samples", ["sample_id"] if index_exists? "devices_samples", ["sample_id"]

end
