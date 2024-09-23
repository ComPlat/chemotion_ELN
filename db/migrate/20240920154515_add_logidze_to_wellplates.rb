class AddLogidzeToWellplates < ActiveRecord::Migration[6.1]
  def change
    add_column :wellplates, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_wellplates, on: :wellplates
      end

      dir.down do
        execute <<~SQL
          DROP TRIGGER IF EXISTS "logidze_on_wellplates" on "wellplates";
        SQL
      end
    end
  end
end
