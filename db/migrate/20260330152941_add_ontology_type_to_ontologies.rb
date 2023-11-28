class AddOntologyTypeToOntologies < ActiveRecord::Migration[6.1]
  def change
    add_column :ontologies, :ontology_type, :string
  end
end
