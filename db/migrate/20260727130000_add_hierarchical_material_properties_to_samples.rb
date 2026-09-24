# frozen_string_literal: true

# Adds the physical-property columns for the HierarchicalMaterial sample type.
#
# Fields intentionally NOT added:
#   * color, state, particle_size — already stored in main's `xref` JSONB
#     (`xref.color`, `xref.physical_state`, `xref.particle_size`) and we keep
#     that storage. Any dev DB that ran an earlier iteration of this migration
#     which had added those columns will have them dropped here.
class AddHierarchicalMaterialPropertiesToSamples < ActiveRecord::Migration[6.1]
  def up
    add_column :samples, :storage_condition, :string, comment: 'storage condition of the Hierarchical sample' unless column_exists?(:samples, :storage_condition)
    add_column :samples, :height, :float, comment: 'height of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :height)
    add_column :samples, :width, :float, comment: 'width of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :width)
    add_column :samples, :length, :float, comment: 'length of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :length)
    add_column :samples, :diameter, :float, comment: 'diameter of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :diameter)
    add_column :samples, :material, :string, comment: 'material of the Hierarchical sample' unless column_exists?(:samples, :material)
    add_column :samples, :cspi, :string, comment: 'CSPI of the Hierarchical sample' unless column_exists?(:samples, :cspi)
    add_column :samples, :shape, :string, comment: 'shape of the Hierarchical sample' unless column_exists?(:samples, :shape)
    add_column :samples, :sieve_fraction, :string, comment: 'sieve fraction of the Hierarchical sample' unless column_exists?(:samples, :sieve_fraction)
    add_column :samples, :layer_thickness, :string, comment: 'Layer thickness of the Hierarchical sample' unless column_exists?(:samples, :layer_thickness)
    add_column :samples, :liquid_medium, :string, comment: 'Liquid medium of the Hierarchical sample' unless column_exists?(:samples, :liquid_medium)
    add_column :samples, :stabilizer, :string, comment: 'Stabilizer of the Hierarchical sample' unless column_exists?(:samples, :stabilizer)

    # Clean up columns from earlier iterations of this branch that were later
    # decided to stay in `xref` (main's storage). Safe no-op on prod (columns
    # were never added there); drops the columns on dev DBs that ran the prior
    # migrations.
    remove_column :samples, :state if column_exists?(:samples, :state)
    remove_column :samples, :color if column_exists?(:samples, :color)
    remove_column :samples, :particle_size if column_exists?(:samples, :particle_size)
  end

  def down
    remove_column :samples, :storage_condition if column_exists?(:samples, :storage_condition)
    remove_column :samples, :height if column_exists?(:samples, :height)
    remove_column :samples, :width if column_exists?(:samples, :width)
    remove_column :samples, :length if column_exists?(:samples, :length)
    remove_column :samples, :diameter if column_exists?(:samples, :diameter)
    remove_column :samples, :material if column_exists?(:samples, :material)
    remove_column :samples, :cspi if column_exists?(:samples, :cspi)
    remove_column :samples, :shape if column_exists?(:samples, :shape)
    remove_column :samples, :sieve_fraction if column_exists?(:samples, :sieve_fraction)
    remove_column :samples, :layer_thickness if column_exists?(:samples, :layer_thickness)
    remove_column :samples, :liquid_medium if column_exists?(:samples, :liquid_medium)
    remove_column :samples, :stabilizer if column_exists?(:samples, :stabilizer)
    # Note: does NOT restore state/color/particle_size — those live in xref.
  end
end
