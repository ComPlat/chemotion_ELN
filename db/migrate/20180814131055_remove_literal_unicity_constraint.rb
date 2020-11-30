class RemoveLiteralUnicityConstraint < ActiveRecord::Migration[4.2]
  def change
    remove_index :literals, name: "index_on_element_literature"
    add_index(:literals, [:element_type, :element_id, :literature_id, :category],  name: 'index_on_element_literature')
  end
end
