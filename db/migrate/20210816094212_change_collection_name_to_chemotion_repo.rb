class ChangeCollectionNameToChemotionRepo < ActiveRecord::Migration[5.2]
  def up
    execute <<-SQL
      UPDATE collections
      SET label = 'chemotion-repository.net'
      WHERE label = 'chemotion.net' AND is_locked = true;
    SQL
  end
end
