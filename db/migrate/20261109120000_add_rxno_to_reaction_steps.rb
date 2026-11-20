# frozen_string_literal: true

class AddRxnoToReactionSteps < ActiveRecord::Migration[6.1]
  def up
    add_column :reaction_steps, :rxno, :string
    execute <<~SQL.squish
      UPDATE reaction_steps SET rxno = reactions.rxno
      FROM reactions
      WHERE reaction_steps.reaction_id = reactions.id AND reaction_steps.position = 1
    SQL
  end

  def down
    remove_column :reaction_steps, :rxno
  end
end
