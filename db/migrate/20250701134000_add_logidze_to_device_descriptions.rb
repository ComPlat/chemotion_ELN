class AddLogidzeToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
      add_column :device_descriptions, :log_data, :jsonb

      reversible do |dir|
        dir.up do
          execute <<~SQL.squish
            SELECT logidze_create_trigger_on_table('device_descriptions', 'logidze_on_device_descriptions', 'updated_at');
          SQL

          execute <<~SQL.squish
            UPDATE device_descriptions as t
            SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
          SQL
        end

        dir.down do
          execute "DROP TRIGGER IF EXISTS logidze_on_device_descriptions on device_descriptions;"
        end
      end

  end
end
