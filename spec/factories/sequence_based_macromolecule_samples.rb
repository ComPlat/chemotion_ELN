# frozen_string_literal: true

FactoryBot.define do
  factory(:sequence_based_macromolecule_sample) do
    sequence(:name) { |index| "SBMM-Sample #{index}" }
    sequence(:short_label) { |index| "SBMM-S-#{index}" }

    sequence_based_macromolecule { nil }

    # conditionally add heterologous_expression, organism, taxon_id, strain, tissue, localisation for non-uniprot proteins
    after(:build) do |sbmm_sample, evaluator|
      next if sbmm_sample.sequence_based_macromolecule.nil?
      next if sbmm_sample.sequence_based_macromolecule.uniprot_derivation == 'uniprot'
      sbmm_sample.heterologous_expression ||= "no" # default is 'unknown' so this might help differentiate
      sbmm_sample.organism ||= "organism"
      sbmm_sample.taxon_id ||= "12345"
      sbmm_sample.strain ||= "Strain"
      sbmm_sample.tissue ||= "Tissue"
      sbmm_sample.localisation ||= "Localisation"
    end
  end
end
