class CreateCodeLogs < ActiveRecord::Migration[4.2]
  def change


    enable_extension 'uuid-ossp' unless extension_enabled? 'uuid-ossp'

    create_table :code_logs, id: :uuid  do |t|
      t.string :source
      t.integer :source_id
      t.string  :value, limit: 40
      t.integer :value_xs
      t.integer :value_sm
      t.datetime :deleted_at
      t.timestamps null: false
    end

    add_index :code_logs, [:source, :source_id]
    add_index :code_logs, :value_xs
    add_index :code_logs, :value_sm

  end

end
