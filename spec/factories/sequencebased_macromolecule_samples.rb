# frozen_string_literal: true

FactoryBot.define do
  factory(:sequence_based_macromolecule_sample) do
    sequence(:name) { |index| "SBMM-Sample #{index}" }
    sequence(:short_label) { |index| "SBMM-S-#{index}" }
    external_label { nil }
    function_or_application { nil }
    concentration_value { nil }
    concentration_unit { nil }
    molarity_value { nil }
    molarity_unit { nil }
    activity_per_volume_value { nil }
    activity_per_volumne_unit { nil }
    activity_per_mass_value { nil }
    activity_per_mass_unit { nil }
    volume_as_used_value { nil }
    volume_as_used_unit { nil }
    amount_as_used_mol_value { nil }
    amount_as_used_mol_unit { nil }
    amount_as_used_mass_value { nil }
    amount_as_used_mass_unit { nil }
    activity_value { nil }
    activity_unit { nil }

    sequence_based_macromolecule { nil }
  end
end
