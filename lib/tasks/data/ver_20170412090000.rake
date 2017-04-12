namespace :data do
  desc "Add default content to every analysis"
  task ver_20170412090000: :environment do
    Container.where(container_type: "analysis")
             .where("(NOT (extended_metadata ?| ARRAY['content']))")
             .each do |ana|
      ana.extended_metadata["content"] = "{\"ops\":[{\"insert\":\"\"}]}"
      ana.save!
    end
  end
end
