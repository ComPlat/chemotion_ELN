class AddLogidzeToAttachments < ActiveRecord::Migration[5.2]
  def change
    add_column :attachments, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_attachments, on: :attachments
      end

      dir.down do
        execute <<~SQL
          DROP TRIGGER IF EXISTS "logidze_on_attachments" on "attachments";
        SQL
      end
    end
  end
end
