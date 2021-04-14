class TextTemplateInit < ActiveRecord::Migration[4.2]
  class TextTemplate < ApplicationRecord
    self.inheritance_column = :_type_disabled
  end
  def up 
#    PredefinedTextTemplate.init_seeds
    predefined_template_seeds_path = File.join(Rails.root, 'db', 'seeds', 'json', 'text_template_seeds.json')
    predefined_templates = JSON.parse(File.read(predefined_template_seeds_path))

    predefined_templates.each do |template|
      next if TextTemplate.where(name: template['name'], type: 'PredefinedTextTemplate').count.positive?

      name = template.delete('name')
      data = template
      user_id = Admin.first.id
      TextTemplate.create(name: name, data: data, user_id: user_id, type: 'PredefinedTextTemplate' )
    end

    Person.all.each(&:create_text_template)
  end
end
