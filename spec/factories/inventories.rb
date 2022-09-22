# frozen_string_literal: true

FactoryBot.define do
  factory :inventory do
    #  inventoriable_id nil
    # trait :for_sample do
    #   association(:inventoriable, factory: :sample)
    # end
    association(:inventoriable, factory: :sample)
    transient do
      inventoriable_id { 1 }
      inventoriable_type { Sample }
    end
  end
end
