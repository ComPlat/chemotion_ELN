class AddLogidzeToScreens < ActiveRecord::Migration[6.1]
  def change
    add_column :screens, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_screens, on: :screens
      end

      dir.down do
        execute <<~SQL
          DROP TRIGGER IF EXISTS "logidze_on_screens" on "screens";
        SQL
      end
    end
  end
end
