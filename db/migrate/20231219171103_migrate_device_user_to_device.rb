class MigrateDeviceUserToDevice < ActiveRecord::Migration[6.1]
  def up
    ActiveRecord::Base.transaction do
      execute <<-SQL
        INSERT INTO devices (
          id, name, name_abbreviation, first_name, last_name, email,
          encrypted_password, account_active, novnc_settings, 
          datacollector_config, created_at, updated_at
        )
        SELECT users.id, CONCAT(first_name, ' ', last_name), name_abbreviation,
               first_name, last_name, email, encrypted_password,
               account_active,
               CASE
               WHEN profiles.data ->> 'novnc' IS NOT NULL THEN
                 (profiles.data ->> 'novnc')::JSONB
               ELSE
                '{}'::jsonb
               END,
               CASE
               WHEN profiles.data ->> 'method' IS NOT NULL THEN
                 jsonb_build_object('method', profiles.data ->> 'method', 'method_params', profiles.data ->> 'method_params')
               ELSE
                '{}'::jsonb
               END,
               users.created_at, users.updated_at
        FROM users
        INNER JOIN profiles ON profiles.user_id = users.id
        WHERE users.type = 'Device';
      SQL

      execute <<-SQL
        UPDATE profiles
        SET deleted_at = NOW()
        FROM users
        WHERE profiles.user_id = users.id 
        AND users.type = 'Device';
      SQL

      execute <<-SQL
        UPDATE users
        SET deleted_at = NOW()
        WHERE users.type = 'Device';
      SQL

      execute <<-SQL
        SELECT last_value, setval('devices_id_seq', (SELECT MAX(id) FROM devices) + 1)
        FROM devices_id_seq;
      SQL
    end
  end

  def down
    ActiveRecord::Base.transaction do
      execute <<-SQL
        UPDATE users
        SET deleted_at = NULL
        WHERE users.type = 'Device';
      SQL

      execute <<-SQL
        UPDATE profiles
        SET deleted_at = NULL
        FROM users
        WHERE profiles.user_id = users.id 
        AND users.type = 'Device';
      SQL

      execute <<-SQL
        DELETE FROM devices;
      SQL
    end
  end
end
