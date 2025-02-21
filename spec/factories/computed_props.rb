# frozen_string_literal: true

FactoryBot.define do
  # ComputedProp factory that creates a status 'completed' ComputedProp
  # with all the required fields.
  # @return [ComputedProp] ComputedProp object with status 'completed'
  # @TODO:
  #   - data.raw should have a valid structure to be processed by the
  #       ComputedProp.from_raw method.
  #   - cover different status values.

  factory :computed_prop do
    creator factory: :person
    # creator { Faker::Number.number(digits: 3) }
    molecule_id { Faker::Number.number(digits: 6) }
    sample_id { Faker::Number.number(digits: 6) }
    max_potential { Faker::Number.between(from: -1000.0, to: 1000.0) }
    min_potential { Faker::Number.between(from: -1000.0, to: 1000.0) }
    mean_potential { Faker::Number.between(from: -100.0, to: 100.0) }
    lumo { Faker::Number.decimal(l_digits: 1, r_digits: 2) * -1 }
    homo { Faker::Number.decimal(l_digits: 1, r_digits: 2) * -1 }
    ip { Faker::Number.decimal(l_digits: 1, r_digits: 2) }
    ea { Faker::Number.decimal(l_digits: 1, r_digits: 2) }
    dipol_debye { Faker::Number.decimal(l_digits: 1, r_digits: 2) }
    status { 6 }
    # status: enum %w[
    #                  pending
    #                  started
    #                  success
    #                  failure
    #                  retry
    #                  revoked
    #                 completed
    #               ]
    data { { 'raw' => 'Sample computation output log...' } }
    mean_abs_potential { Faker::Number.between(from: 0.0, to: 200.0) }
    tddft do
      {
        's1_osc' => Faker::Number.decimal(l_digits: 1, r_digits: 6),
        't1_osc' => Faker::Number.decimal(l_digits: 1, r_digits: 6),
        'delta_est' => Faker::Number.decimal(l_digits: 1, r_digits: 6),
        's1_dipole' => "#{Faker::Number.decimal(l_digits: 1,
                                                r_digits: 6)} #{Faker::Number.decimal(
                                                  l_digits: 1, r_digits: 6,
                                                )} #{Faker::Number.decimal(l_digits: 1, r_digits: 6)}",
        's1_energy' => Faker::Number.decimal(l_digits: 1, r_digits: 6),
        't1_dipole' => "#{Faker::Number.decimal(l_digits: 1,
                                                r_digits: 6)} #{Faker::Number.decimal(
                                                  l_digits: 1, r_digits: 6,
                                                )} #{Faker::Number.decimal(l_digits: 1, r_digits: 6)}",
        't1_energy' => Faker::Number.decimal(l_digits: 1, r_digits: 6),
        'tadf_rate' => Faker::Number.decimal(l_digits: 5, r_digits: 6),
      }
    end
    task_id { SecureRandom.uuid }
    deleted_at { nil }
  end
end
