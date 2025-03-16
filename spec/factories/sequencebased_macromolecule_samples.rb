# frozen_string_literal: true

FactoryBot.define do
  factory(:sequence_based_macromolecule_sample) do
    sequence(:name) { |index| "SBMM-Sample #{index}" }
    sequence(:short_label) { |index| "SBMM-S-#{index}" }
    external_label { nil }
    function_or_application { nil }
    concentration { nil }
    molarity { nil }
    volume_as_used { }

    sequence_based_macromolecule { nil }
  end
end
