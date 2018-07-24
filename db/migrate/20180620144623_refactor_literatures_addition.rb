class RefactorLiteraturesAddition < ActiveRecord::Migration
  def self.up
    add_column :literatures, :refs, :jsonb unless column_exists? :literatures, :refs
    add_column :literatures, :doi, :string unless column_exists? :literatures, :doi

    create_table :literals do |t|
      t.integer :literature_id
      t.integer :element_id
      t.string :element_type, limit: 40
      t.string :category, limit: 40
      t.integer :user_id
      t.timestamps null: false
    end

    add_foreign_key :literals, :literatures
    add_index(:literals, [:element_type, :element_id, :literature_id, :category], unique: true, name: 'index_on_element_literature')
    add_index(:literals, [:literature_id, :element_type, :element_id], name: 'index_on_literature')


    Literature.reset_column_information
    Literature.find_each do |lit|
      r = Reaction.find_by(id: lit.reaction_id)
      if r
       Literal.create!(
         literature_id: lit.id, element_id: lit.reaction_id, element_type: 'Reaction',
           user_id: r.created_by
       )
      else
        lit.destroy!
      end
    end
  end

  def self.down
    drop_table :literals if table_exists? :literals
  end


end
