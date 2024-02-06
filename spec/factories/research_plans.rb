FactoryBot.define do
  factory :research_plan do
    sequence(:name) { |i| "Research plan #{i}" }

    body do
      [
        { "id"=>SecureRandom.uuid,
          "type"=>"richtext",
          "value"=>{ "ops"=>[{ "insert"=>"some text here\n" }] } },

      ]
    end

    trait :with_image_field do
      body do
        [
          { 'id' => SecureRandom.uuid,
            'type' => 'image',
            'value' => {
              "file_name": "Screenshot from 2021-03-04 09-05-30.png",
              "public_name": "800ee110-3420-11ed-af52-2bf1404da86a"
            } }
        ]
      end
    end

    trait :with_linked do
      name { 'Linked Research Plan' }

      body do
        [
          {
            'id' => SecureRandom.uuid,
            'type' => 'reaction',
            'value' => { 'reaction_id' => 100 },
          },
        ]
      end
    end

    callback(:before_create) do |research_plan|
      research_plan.creator = FactoryBot.build(:user) unless research_plan.creator
    end
  end
end
