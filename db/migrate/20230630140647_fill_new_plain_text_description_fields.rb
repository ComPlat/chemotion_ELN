# frozen_string_literal: true

class FillNewPlainTextDescriptionFields < ActiveRecord::Migration[6.1]
  def up
    Reaction.where.not(description: nil).or(Reaction.where.not(observation: nil)).find_each do |reaction|
      description = Chemotion::QuillToPlainText.convert(reaction.description)
      observation = Chemotion::QuillToPlainText.convert(reaction.observation)
      if description.present? || observation.present?
        reaction.update_columns(plain_text_observation: observation, plain_text_description: description)
      end
      # force gc of node processes
      ObjectSpace.garbage_collect
    end
    Screen.where.not(description: nil).find_each do |screen|
      description = Chemotion::QuillToPlainText.convert(screen.description)
      next if description.blank?

      screen.update_columns(plain_text_description: description)
      ObjectSpace.garbage_collect
    end
    Wellplate.where.not(description: nil).find_each do |wellplate|
      description = Chemotion::QuillToPlainText.convert(wellplate.description)
      next if description.blank?

      wellplate.update_columns(plain_text_description: description)
      ObjectSpace.garbage_collect
    end
  end

  def down
    Reaction.where.not(description: nil).or(Reaction.where.not(observation: nil)).find_each do |reaction|
      reaction.update_columns(plain_text_description: nil, plain_text_observation: nil)
    end
    Screen.where.not(description: nil).find_each do |screen|
      screen.update_columns(plain_text_description: nil)
    end
    Wellplate.where.not(description: nil).find_each do |wellplate|
      wellplate.update_columns(plain_text_description: nil)
    end
  end
end
