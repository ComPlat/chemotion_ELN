# frozen_string_literal: true

FactoryBot.define do
  factory(:sequence_based_macromolecule_sample) do
    sequence(:name) { |index| "SBMM-Sample #{index}" }
    sequence(:short_label) { |index| "SBMM-S-#{index}" }

    sequence_based_macromolecule { nil }
  end
end
