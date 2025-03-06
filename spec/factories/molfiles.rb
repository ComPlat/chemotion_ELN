# frozen_string_literal: true

# Factory for molfiles
DICT = {
  water: 'WATER.mol',
  aromatics: %w[1F-2Cl-3F-benzen.mol 1F-3F-benzen.mol],
  aromtic_2sub: '1F-3F-benzen.mol',
  aromtic_3sub: '1F-2Cl-3F-benzen.mol',
  aromatic_explicit_hydrogen: 'Q-1F-2H-3F-benzen.mol',
}.freeze

FIXTURES = Rails.root.join('spec/fixtures/molfiles')

FactoryBot.define do
  factory :molfile, class: String do
    transient do
      type { :water }
      sequence(:index)
    end
    initialize_with do
      src = DICT[type]
      filename = src.is_a?(Array) ? src[index % src.size] : src
      FIXTURES.join(filename).read
    end
  end
end
