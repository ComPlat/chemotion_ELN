class AllowSbmmSubtypeToBeNullable < ActiveRecord::Migration[6.1]
  def change
    change_column_null(:sequence_based_macromolecules, :sbmm_subtype, true)
  end
end
