# frozen_string_literal: true

class AddHierarchicalPropertiesToSamples < ActiveRecord::Migration[6.1]
  def up
    add_column :samples, :diameter, :float, comment: 'diameter of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :diameter)
    add_column :samples, :material, :string, comment: 'material of the Hierarchical sample' unless column_exists?(:samples, :material)
    add_column :samples, :cspi, :string, comment: 'CSPI of the Hierarchical sample' unless column_exists?(:samples, :cspi)
    add_column :samples, :particle_size, :string, comment: 'particle size of the Hierarchical sample' unless column_exists?(:samples, :particle_size)
    add_column :samples, :shape, :string, comment: 'shape of the Hierarchical sample' unless column_exists?(:samples, :shape)
    add_column :samples, :sieve_fraction, :string, comment: 'sieve fraction of the Hierarchical sample' unless column_exists?(:samples, :sieve_fraction)
    add_column :samples, :layer_thickness, :string, comment: 'Layer thickness of the Hierarchical sample' unless column_exists?(:samples, :layer_thickness)
    add_column :samples, :liquid_medium, :string, comment: 'Liquid medium of the Hierarchical sample' unless column_exists?(:samples, :liquid_medium)
    add_column :samples, :stabilizer, :string, comment: 'Stabilizer of the Hierarchical sample' unless column_exists?(:samples, :stabilizer)
  end

  def down
    remove_column :samples, :diameter if column_exists?(:samples, :diameter)
    remove_column :samples, :material if column_exists?(:samples, :material)
    remove_column :samples, :cspi if column_exists?(:samples, :cspi)
    remove_column :samples, :particle_size if column_exists?(:samples, :particle_size)
    remove_column :samples, :shape if column_exists?(:samples, :shape)
    remove_column :samples, :sieve_fraction if column_exists?(:samples, :sieve_fraction)
    remove_column :samples, :layer_thickness if column_exists?(:samples, :layer_thickness)
    remove_column :samples, :liquid_medium if column_exists?(:samples, :liquid_medium)
    remove_column :samples, :stabilizer if column_exists?(:samples, :stabilizer)
  end
end
