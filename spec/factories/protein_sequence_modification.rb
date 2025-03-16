# frozen_string_literal: true

FactoryBot.define do
  factory :protein_sequence_modification do
    modification_n_terminal { false }
    modification_n_terminal_details { }
    modification_c_terminal { false }
    modification_c_terminal_details { }
    modification_insertion { false }
    modification_insertion_details { }
    modification_deletion { false }
    modification_deletion_details { }
    modification_mutation { false }
    modification_mutation_details { }
    modification_other { false }
    modification_other_details { }
    deleted_at { }
  end
end
