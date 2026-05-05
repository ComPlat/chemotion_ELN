# frozen_string_literal: true

class AddHierarchicalPropertiesToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :diameter, :float, comment: 'diameter of the Hierarchical sample (numeric, in cm or mm)'
    add_column :samples, :material, :string, comment: 'material of the Hierarchical sample'
    add_column :samples, :cspi, :string, comment: 'CSPI of the Hierarchical sample'
    add_column :samples, :particle_size, :string, comment: 'particle size of the Hierarchical sample'
    add_column :samples, :shape, :string, comment: 'shape of the Hierarchical sample'
    add_column :samples, :sieve_fraction, :string, comment: 'sieve fraction of the Hierarchical sample'
  end
end
