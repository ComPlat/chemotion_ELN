class CreateMetadata < ActiveRecord::Migration[5.2]
  def change
    create_table :metadata do |t|
      t.integer :collection_id
      t.jsonb :metadata
      t.datetime :deleted_at

      t.timestamps
    end
  end
end
