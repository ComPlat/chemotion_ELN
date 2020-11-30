class AddReactionSvgFileToReactions < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions, :reaction_svg_file, :string
  end
end
