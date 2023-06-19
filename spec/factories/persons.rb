FactoryBot.define do
  factory :person, class: 'Person', parent: :user do
    type { 'Person' }
    first_name { 'John' }
    last_name { 'Doe' }

    counters do
      {
        samples: 0,
        reactions: 0,
        wellplates: 0
      }
    end
  end
end