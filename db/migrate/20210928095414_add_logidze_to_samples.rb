class AddLogidzeToSamples < ActiveRecord::Migration[5.2]
  def change
    add_column :samples, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_samples, on: :samples
      end

      dir.down do
        execute "DROP TRIGGER IF EXISTS logidze_on_samples on samples;"
      end
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL
          UPDATE samples as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end
    end
  end
end
