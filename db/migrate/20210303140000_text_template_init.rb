class TextTemplateInit < ActiveRecord::Migration[4.2]
  def change
    PredefinedTextTemplate.init_seeds
    Person.all.each(&:create_text_template)
  end
end
