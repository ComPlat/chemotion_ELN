class TextTemplateInit < ActiveRecord::Migration[4.2]
  class TextTemplate < ActiveRecord::Base
    self.inheritance_column = nil
  end

  def change
    predefined_template_seeds_path = File.join(Rails.root, 'db', 'seeds', 'json', 'text_template_seeds.json')
    predefined_templates = JSON.parse(File.read(predefined_template_seeds_path))

    predefined_templates.each do |template|
      next if TextTemplate.where(name: template['name'], type: 'PredefinedTextTemplate').count.positive?

      template_name = template.delete('name')
      TextTemplate.create!(
        type: 'PredefinedTextTemplate',
        name: template_name,
        data: template,
        user_id: Admin.first&.id || 0
      )
    end
  end
end
