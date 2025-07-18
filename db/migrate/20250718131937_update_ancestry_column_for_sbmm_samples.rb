class UpdateAncestryColumnForSbmmSamples < ActiveRecord::Migration[6.1]
  def up
    change_column(
      :sequence_based_macromolecule_samples,
      :ancestry,
      :string,
      collation: 'C',
      default: '/',
      null: false
    )
    remove_index :sequence_based_macromolecule_samples, name: 'idx_sbmm_samples_ancestry'
    add_index(
      :sequence_based_macromolecule_samples,
      :ancestry,
      name: 'idx_sbmm_samples_ancestry',
      unique: false,
      where: "deleted_at IS NULL",
      opclass: :varchar_pattern_ops
    )
  end

  def down
    remove_index :sequence_based_macromolecule_samples, name: 'idx_sbmm_samples_ancestry'
    add_index :sequence_based_macromolecule_samples, :ancestry, name: 'idx_sbmm_samples_ancestry'
    change_column :sequence_based_macromolecule_samples, :ancestry, :string, null: true, default: nil
  end
end
