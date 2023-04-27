class AddLogidzeToElementalCompositions < ActiveRecord::Migration[5.2]
  def change
    add_column :elemental_compositions, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_elemental_compositions, on: :elemental_compositions
      end

      dir.down do
        execute "DROP TRIGGER IF EXISTS logidze_on_elemental_compositions on elemental_compositions;"
      end
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL
          UPDATE elemental_compositions as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end
    end
  end
end
