class AddDetailLevelToCollections < ActiveRecord::Migration[6.1]
  def change
    # for some strange reason, ElementPolicy#maximum_element_permission_level does not use regular model naming conventions
    # so we have to satisfy their strange naming scheme
    # Usually I would expect to use 'sequence_based_macromolecule_sample_detail_level', but instead it's as seen below
    # I assume this was done as there was one existing field following this scheme: researchplan_detail_level
    add_column :collections, :sequencebasedmacromoleculesample_detail_level, :integer, default: 10
    add_column :sync_collections_users, :sequencebasedmacromoleculesample_detail_level, :integer, default: 10
  end
end
