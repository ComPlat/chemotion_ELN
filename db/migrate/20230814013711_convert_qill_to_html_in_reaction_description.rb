# frozen_string_literal: true

class ConvertQillToHtmlInReactionDescription < ActiveRecord::Migration[6.1]
  def up
    Reaction.find_each do |reaction|
      reaction.update_columns(
        description: Chemotion::QuillToHtml.new.convert(YAML.load(reaction.description))
      )
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
