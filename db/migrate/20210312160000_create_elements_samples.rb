class CreateElementsSamples < ActiveRecord::Migration
  def change
    create_table :elements_samples do |t|
      t.integer :element_id
      t.integer :sample_id
      t.integer :created_by
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
      t.index :element_id
      t.index :sample_id
    end
  end
end

