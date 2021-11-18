class AddLogidzeToReactions < ActiveRecord::Migration[5.2]
  def change
    add_column :reactions, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_reactions, on: :reactions
      end

      dir.down do
        execute "DROP TRIGGER IF EXISTS logidze_on_reactions on reactions;"
      end
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL
          UPDATE reactions as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end
    end
  end
end
