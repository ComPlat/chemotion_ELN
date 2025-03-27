# frozen_string_literal: true

# Factory for smiles
SMILES_DICT = {
  water: 'O',
  benzen: 'c1ccccc1',
  faulty: 'C1CCCCN1(C)[Al]([H])(I)(I)N1(C)CCCCC1',
  invalid: 'invalid_string',
}.freeze

# regex to extract the smiles line from a molfile
# the smiles line is the first line after '> <smiles>'
SMILES_LINE_REGEX = /^> <\w*\s?smiles>\n(?<smiles>\S*)\n$/m.freeze

FactoryBot.define do
  factory :smiles, class: String do
    transient do
      type { :water }
      sequence(:index)
      from_ctab { nil } # if set, the smiles will be extracted from the ctab
    end
    initialize_with do
      if from_ctab.present?
        # return the smiles line from the ctab
        match = from_ctab.match(SMILES_LINE_REGEX)
        next match.present? && match[:smiles]
      end

      src = SMILES_DICT[type]
      src.is_a?(Array) ? src[index % src.size] : src
    end
  end
end
