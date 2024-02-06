class FillNewPlainTextDescriptionFields < ActiveRecord::Migration[6.1]
  def up
    Reaction.where.not(description: nil).or(Reaction.where.not(observation: nil)).each do | reaction |
      description = Chemotion::QuillToPlainText.new.convert(reaction.description)
      observation = Chemotion::QuillToPlainText.new.convert(reaction.observation)
      reaction.update_columns(plain_text_description: description, plain_text_observation: observation)
    end
    Screen.where.not(description: nil).each do | screen |
      screen.update_columns(plain_text_description: Chemotion::QuillToPlainText.new.convert(screen.description))
    end
    Wellplate.where.not(description: nil).each do | wellplate |
      wellplate.update_columns(plain_text_description: Chemotion::QuillToPlainText.new.convert(wellplate.description))
    end
  end

  def down
    Reaction.where.not(description: nil).or(Reaction.where.not(observation: nil)).each do | reaction |
      reaction.update_columns(plain_text_description: nil, plain_text_observation: nil)
    end
    Screen.where.not(description: nil).each do | screen |
      screen.update_columns(plain_text_description: nil)
    end
    Wellplate.where.not(description: nil).each do | wellplate |
      wellplate.update_columns(plain_text_description: nil)
    end
  end
end
