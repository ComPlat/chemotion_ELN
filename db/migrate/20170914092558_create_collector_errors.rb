class CreateCollectorErrors < ActiveRecord::Migration[4.2]
  def change
    create_table :collector_errors do |t|
      t.string :error_code

      t.timestamps null: false
    end
  end
end
