# frozen_string_literal: true

class RenameOntologiesChmoIdToOntologyId < ActiveRecord::Migration[6.1]
  def change
    rename_column :ontologies, :chmo_id, :ontology_id
  end
end
