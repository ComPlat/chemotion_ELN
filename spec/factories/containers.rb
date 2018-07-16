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
    description 'no description'
    container_type 'analysis'
    after(:build) do |analysis|
      analysis.extended_metadata = {
        'kind' => '13C NMR',
        'status' => 'Confirmed',
        #'datasets' => [],
        'content' => "{\"ops\": [{\"insert\": \"analysis contents\"}]}"
      }.merge(analysis.extended_metadata || {})
    end
  end

  # Inbox container root
  factory :inbox_container_root, class: Container do
    name "inbox"
    containable_type "User"
    description ""
    extended_metadata {}
    container_type "root"
  end

  # Inbox container with attachments
  factory :inbox_container, class: Container do
    name "IR"
    description ""
    extended_metadata {}
    container_type "sender_box_68"

    factory :inbox_container_with_attachments do
      transient do
        number_of_attachments 2
      end
      after(:create) do |inbox_container, files|
        FactoryGirl.create_list(:attachment, files.number_of_attachments, container: inbox_container)
      end
    end
  end
  
end
