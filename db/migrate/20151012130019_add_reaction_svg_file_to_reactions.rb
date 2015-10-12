class AddReactionSvgFileToReactions < ActiveRecord::Migration
  def change
    add_column :reactions, :reaction_svg_file, :string
  end
end
