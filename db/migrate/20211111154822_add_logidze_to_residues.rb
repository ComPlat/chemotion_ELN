class AddLogidzeToResidues < ActiveRecord::Migration[5.2]
  def change
    add_column :residues, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_residues, on: :residues
      end

      dir.down do
        execute "DROP TRIGGER IF EXISTS logidze_on_residues on residues;"
      end
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL
          UPDATE residues as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end
    end
  end
end
