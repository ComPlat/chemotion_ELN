class UpdateAncestryDataForSbmmSamples < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL.squish
      UPDATE sequence_based_macromolecule_samples
      SET ancestry = '/' || trim(both '/' FROM ancestry) || '/'
      WHERE ancestry IS NOT NULL;
    SQL

    execute <<~SQL.squish
      UPDATE sequence_based_macromolecule_samples
      SET ancestry = '/'
      WHERE ancestry IS NULL;
    SQL
  end

  def down
    execute <<~SQL.squish
      UPDATE sequence_based_macromolecule_samples
      SET ancestry = NULL
      WHERE ancestry = '/';
    SQL

    execute <<~SQL.squish
      UPDATE sequence_based_macromolecule_samples
      SET ancestry = trim(both '/' FROM ancestry)
      WHERE ancestry IS NOT NULL;
    SQL
  end
end
