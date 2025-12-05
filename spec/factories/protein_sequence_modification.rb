# frozen_string_literal: true

FactoryBot.define do
  factory :protein_sequence_modification do
    modification_n_terminal { true }
    modification_n_terminal_details { 'Something else' }
    modification_c_terminal { false }
    modification_c_terminal_details { nil }
    modification_insertion { false }
    modification_insertion_details { nil }
    modification_deletion { false }
    modification_deletion_details { nil }
    modification_mutation { false }
    modification_mutation_details { nil }
    modification_other { false }
    modification_other_details { nil }
    deleted_at { nil }
  end
end
