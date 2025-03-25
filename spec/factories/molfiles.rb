# frozen_string_literal: true

# Factory for molfiles
MOLFILE_FIXTURES_DIR = Rails.root.join('spec/fixtures/structures/molfiles')

# list of filenames for molfiles in spec/fixtures/molfiles
# ensure the molfiles there have a "> <smiles>\n {smiles}\n" attribute
# so that the smiles factory can be used to generate the smiles out of the molfile
MOLFILE_DICT = {
  water: 'WATER.mol',
  aromatics: %w[1F-2Cl-3F-benzen.mol 1F-3F-benzen.mol],
  aromtic_2sub: '1F-3F-benzen.mol',
  aromtic_3sub: '1F-2Cl-3F-benzen.mol',
  aromatic_explicit_hydrogen: 'Q-1F-2H-3F-benzen.mol',
  invalid: 'invalid_01.mol',
}.freeze

FactoryBot.define do
  factory :molfile, class: String do
    transient do
      type { :water }
      sequence(:index)
    end
    initialize_with do
      src = MOLFILE_DICT[type]
      filename = src.is_a?(Array) ? src[index % src.size] : src
      MOLFILE_FIXTURES_DIR.join(filename).read
    end
  end
end
