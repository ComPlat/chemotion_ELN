# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    initialize_with { type.present? ? type.constantize.new : User.new }

    type { nil }
    sequence(:email) { |n| "foobar#{n}@bar.de" }
    first_name { 'first_name' }
    last_name { 'last_name' }
    sequence(:name_abbreviation) do |n|
      ltrs = [*'a'..'z', *'A'..'Z'] # 52 alphabetic characters
      chrs = [*0..9] + ltrs         # 62 alphanumeric characters
      "#{ltrs[n / 52 / 62 % 62]}#{chrs[n / 62 % 62]}#{chrs[n % 62]}"
    end
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
        data[:layout] = {
          'sample' => 1,
          'reaction' => 2,
          'wellplate' => 3,
          'screen' => 4,
          'research_plan' => 5
        }
        profile.update_columns(data: data)
      end
    end

    factory :generic_user do
      callback(:after_create) do |user|
        profile = user.profile
        data = profile&.data
        unless data.nil?
          data[:generic_admin] = { elements: true, segments: true, datasets: true }
          # data.merge!(generic_admin: { elements: true, segments: true, datasets: true })
          profile.update_columns(data: data)
        end
      end
    end
  end
end
