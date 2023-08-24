class GenericElementsToElement < ActiveRecord::Migration[5.2]
  def change
    unless table_exists? :elements_elements
      create_table :elements_elements do |t|
        t.integer :element_id
        t.integer :parent_id
        t.integer :created_by
        t.datetime :created_at
        t.datetime :updated_at
        t.datetime :deleted_at
        t.index :element_id
        t.index :parent_id
      end
    end
  end
end
