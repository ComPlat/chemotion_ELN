class DropCodeLogs < ActiveRecord::Migration[4.2]
  def change

    drop_table :code_logs

  end

  remove_index :code_logs, [:source, :source_id] if index_exists? :code_logs, [:source, :source_id]
  remove_index :code_logs, :value if index_exists? :code_logs, :value

end
