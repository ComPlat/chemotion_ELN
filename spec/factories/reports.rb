FactoryBot.define do
  factory :report do
    transient do
      user { user }
    end

    trait :downloadable do
      file_path "path"
    end

    trait :undownloadable do
      file_path { nil }
    end

    author_id { user.id }
    file_name "ELN_Report"
    file_description "This is description"
    img_format "png"
    configs { {page_break: true, whole_diagram: true} }
    sample_settings { { diagram: true, collection: true,
                        analyses: true, reaction_description: true } }
    reaction_settings { { diagram: true,
                          material: true,
                          description: true,
                          purification: true,
                          tlc: true,
                          observation: true,
                          analysis: true,
                          literature: true} }
    objects { [{ id: 4, type: "sample"}, { id: 5, type: "Reaction"}] }
    generated_at { Time.zone.now }

    after(:create) do |report, elevator|
      elevator.user.reports << report
    end
  end
end
