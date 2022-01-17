class CreateElementsSamples < ActiveRecord::Migration[4.2]
  def change
    unless table_exists? :elements_samples
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
end

