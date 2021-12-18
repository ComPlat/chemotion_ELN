class CreateChemscannerSourceHierarchies < ActiveRecord::Migration[5.2]
  def change
    create_table :chemscanner_source_hierarchies, id: false do |t|
      t.integer :ancestor_id, null: false
      t.integer :descendant_id, null: false
      t.integer :generations, null: false
    end

    add_index :chemscanner_source_hierarchies, [:ancestor_id, :descendant_id, :generations],
      unique: true,
      name: "chemscanner_source_anc_desc_idx"

    add_index :chemscanner_source_hierarchies, [:descendant_id],
      name: "chemscanner_source_desc_idx"
  end
end
