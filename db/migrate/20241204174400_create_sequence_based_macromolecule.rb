class CreateSequenceBasedMacromolecule < ActiveRecord::Migration[6.1]
  def change
    create_table :sequence_based_macromolecules do |t|
      t.string :name, null: false
      t.jsonb :uniprot_source, null: false
      t.string :uniprot_ids, null: false, index: true, array: true # Question: Do we only save the first or all? What do we want to search?
      t.datetime :deleted_at, null: true, index: true
      t.timestamps
    end
  end
end
