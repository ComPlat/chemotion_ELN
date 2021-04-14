namespace :data do
  desc 'Migrate predefined text template from JSON'
  task ver_20201212022300_migrate_predefined_text_template: :environment do
    predefined_template_seeds_path = File.join(Rails.root, 'db', 'text_template_seeds.json')
    predefined_templates = JSON.parse(File.read(predefined_template_seeds_path))
    admin = Admin.first

    predefined_templates.each do |template|
      next if PredefinedTextTemplate.where(name: template["name"]).count > 0

      text_template = PredefinedTextTemplate.new
      text_template.name = template.delete("name")
      text_template.data = template
      text_template.user_id = admin.id
      text_template.save!
    end
  end
end
