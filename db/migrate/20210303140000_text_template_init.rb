class TextTemplateInit < ActiveRecord::Migration
  def change
    PredefinedTextTemplate.init_seeds
    Person.all.each(&:create_text_template)
  end
end
