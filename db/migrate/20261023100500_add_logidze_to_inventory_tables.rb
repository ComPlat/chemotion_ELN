# frozen_string_literal: true

# Audit history for admin changes to connections and mappings, and for share changes. The connection
# history leaves out the credential ciphertext.
class AddLogidzeToInventoryTables < ActiveRecord::Migration[6.1]
  TRIGGERS = {
    inventory_connections: "logidze_logger(null, 'updated_at', '{credentials_ciphertext}')",
    inventory_mapping_versions: "logidze_logger(null, 'updated_at')",
    collection_shares: "logidze_logger(null, 'updated_at')",
  }.freeze

  def up
    TRIGGERS.each do |table, logger|
      execute <<~SQL.squish
        CREATE TRIGGER logidze_on_#{table} BEFORE INSERT OR UPDATE ON #{table} FOR EACH ROW
        WHEN (coalesce(current_setting('logidze.disabled', true), '') <> 'on') EXECUTE PROCEDURE #{logger}
      SQL
    end
  end

  def down
    TRIGGERS.each_key { |table| execute "DROP TRIGGER IF EXISTS logidze_on_#{table} ON #{table}" }
  end
end
