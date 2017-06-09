FactoryGirl.define do
  factory :container do
    name "root"
    attachments []
    description ""
    extended_metadata {}
    container_type "root"

    trait :with_analysis do
      after(:create) do |container|
        extended_metadata = {
          "kind" => "13C NMR",
          "status" => "Confirmed",
          "datasets" => [],
          "content" => "{\"ops\": [{\"insert\": \"analysis contents\"}]}"
        }

        analyses = FactoryGirl.create(:container, parent: container, container_type: "analyses")
        analysis = FactoryGirl.create(:container, parent: analyses,
          container_type: "analysis",
          name: "new",
          description: "analysis description",
          extended_metadata: extended_metadata
        )

      end
    end
  end

  factory :root_container, class: Container do
    name "root"
    attachments []
    description ""
    extended_metadata {}
    container_type "root"
    after(:create) do |container|
      analyses = FactoryGirl.create(:container, parent: container, container_type: "analyses")
    end
  end

  factory :analysis_container, class: Container do
    sequence(:name) { |i| "Analysis #{i}" }
    attachments []
    extended_metadata = {
      'kind' => '13C NMR',
      'status' => 'Confirmed',
      #'datasets' => [],
      'content' => "{\"ops\": [{\"insert\": \"analysis contents\"}]}"
    }
    description 'no description'
    container_type 'analysis'

  end
end
