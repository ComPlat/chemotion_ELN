class AddAbsMeanPotentialToComputedProp < ActiveRecord::Migration
  def change
    add_column :computed_props, :mean_abs_potential, :float, default: 0.0
  end
end
