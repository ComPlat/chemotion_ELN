namespace :data do
  desc 'Migrate reaction description to text template'
  task ver_20210110090000_migrate_reaction_description_to_text_template: :environment do
    default_template = {
      '_toolbar': %w[
        ndash water-free resin-solvent resin-solvent-reagent hand-stop
        reaction-procedure gpx-a gpx-b washed-nahco3 acidified-hcl tlc-control
        dried isolated residue-purified residue-adsorbed residue-dissolved
      ]
    }

    Person.all.each do |u|
      template = ReactionDescriptionTextTemplate.new
      template.user_id = u.id
      template.data = default_template
      template.save!
    end
  end
end
