require Rails.root.join('lib/tasks/support/molecule_structure_curation.rb')

class FixMolfiles < ActiveRecord::Migration[6.1]
  def up
    MoleculeStructureCuration.new.process
  end

  def down
    # No rollback needed for this Migration
  end
end

