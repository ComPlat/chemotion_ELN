class CreateOlsTerms < ActiveRecord::Migration
  def change
    #drop_table(:ols_terms, if_exists: true)
    create_table :ols_terms do |t|
      t.string :ols_name
      t.string :term_id
      t.string :ancestry
      t.string :ancestry_term_id
      t.string :label
      t.string :synonym
      t.jsonb :synonyms
      t.string :desc
      t.jsonb :metadata
      t.boolean :is_enabled, default: true
      t.timestamps null: false
    end
    add_index :ols_terms, [:ols_name, :term_id], unique: true
    add_index :ols_terms, :ancestry

    add_column :reactions, :rxno, :string
  end
end
