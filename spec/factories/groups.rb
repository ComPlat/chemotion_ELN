FactoryBot.define do
  factory :group, class: 'Group', parent: :user do
    type { 'Group' }
    first_name { 'gro' }
    last_name { 'up' }

    counters do
      {
        samples: 0,
        reactions: 0,
        wellplates: 0
      }
    end
  end
end
