FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "foobar#{n}@bar.de" }
    first_name { 'first_name' }
    last_name { 'last_name' }
    sequence(:name_abbreviation) { |n| "U#{n}" }
    password { 'testtest' }
    password_confirmation { 'testtest' }
    counters do
      {
        samples: 0,
        reactions: 0,
        wellplates: 0
      }
    end

    callback(:after_create) do |user|
      profile = user.profile
      data = profile&.data
      unless data.nil?
        data.merge!(layout: {
          'sample' => 1,
          'reaction' => 2,
          'wellplate' => 3,
          'screen' => 4,
          'research_plan' => 5
        })
        profile.update_columns(data: data)
      end
    end
  end
end
