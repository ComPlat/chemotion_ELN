# frozen_string_literal: true

# rubocop:disable Layout/LineLength
FactoryBot.define do
  # ATTENTION: This factory does not produce valid data of its own. Please use the more specific factories: :uniprot_sbmm, :modified_uniprot_sbmm and :non_uniprot_sbmm
  factory(:sequence_based_macromolecule) do
    uniprot_source { {} }
    sbmm_type { 'protein' }
    sbmm_subtype { 'unmodified' }
    uniprot_derivation { 'uniprot' }
    primary_accession { nil }
    accessions { [] }
    ec_numbers { [] }
    pdb_doi { nil }
    systematic_name { nil }
    sequence(:short_name) { |n| "SBMM-#{n}" }
    molecular_weight { 12_345 }
    add_attribute(:sequence) { 'ABCDEFG' }
    link_uniprot { nil }
    heterologous_expression { 'unknown' }
    organism { nil }
    taxon_id { nil }
    strain { nil }
    tissue { nil }
    localisation { nil }
    protein_source_details_comments { nil }
    protein_source_details_expression_system { nil }
    deleted_at { nil }

    factory(:uniprot_sbmm) do
      uniprot_source { 'UNIPROT_JSON' }
      primary_accession { 'P12345' }
      accessions { %w[P12345 G1SKL2] }
      ec_numbers { ['2.6.1.1', '2.6.1.7'] }
      add_attribute(:sequence) { 'MALLHSARVLSGVASAFHPGLAAAASARASSWWAHVEMGPPDPILGVTEAYKRDTNSKKMNLGVGAYRDDNGKPYVLPSVRKAEAQIAAKGLDKEYLPIGGLAEFCRASAELALGENSEVVKSGRFVTVQTISGTGALRIGASFLQRFFKFSRDVFLPKPSWGNHTPIFRDAGMQLQSYRYYDPKTCGFDFTGALEDISKIPEQSVLLLHACAHNPTGVDPRPEQWKEIATVVKKRNLFAFFDMAYQGFASGDGDKDAWAVRHFIEQGINVCLCQSYAKNMGLYGERVGAFTVICKDADEAKRVESQLKILIRPMYSNPPIHGARIASTILTSPDLRKQWLQEVKGMADRIIGMRTQLVSNLKKEGSTHSWQHITDQIGMFCFTGLKPEQVERLTKEFSIYMTKDGRISVAGVTSGNVGYLAHAIHQVTK' }
      link_uniprot { 'https://www.uniprot.org/uniprotkb/P12345/entry' }
      organism { 'Oryctolagus cuniculus' }
      taxon_id { '9986' }
    end

    factory(:modified_uniprot_sbmm) do
      uniprot_derivation { 'uniprot_modified' }

      after(:build) do |sbmm, _evaluator|
        sbmm.parent ||= build(:uniprot_sbmm)
        sbmm.protein_sequence_modification ||= build(:protein_sequence_modification)
        sbmm.post_translational_modification ||= build(:post_translational_modification)
      end
    end

    factory(:non_uniprot_sbmm) do
      uniprot_derivation { 'uniprot_unknown' }
      after(:build) do |sbmm, _evaluator|
        sbmm.parent = nil # non_uniprot_sbmm do not have a parent
        sbmm.protein_sequence_modification ||= build(:protein_sequence_modification)
        sbmm.post_translational_modification ||= build(:post_translational_modification)
      end
    end
  end
end
# rubocop:enable Layout/LineLength
