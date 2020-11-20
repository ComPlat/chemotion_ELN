#desc ketcherails  common-templates, amino-acid, name-abbreviations seeds
#Ketcherails::Engine.load_seed
!User.find_by(email: 'template.moderator@eln.edu') && User.create!(
  email: 'template.moderator@eln.edu', password: '@eln.edu', first_name: 'Template', last_name: 'Moderator',
  name_abbreviation: 'TMo', confirmed_at: Time.now,
#  is_templates_moderator: true # Use admin user managment page to set it instead
)

Dir[File.join(Rails.root, 'db', 'seeds', '*.rb')].sort.each do |seed|
  load seed
end
