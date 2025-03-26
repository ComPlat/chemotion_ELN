# frozen_string_literal: true

FactoryBot.define do
  factory(:sequence_based_macromolecule) do
    uniprot_source { {} }
    sbmm_type { "protein" }
    sbmm_subtype { "unmodified" }
    uniprot_derivation { "uniprot" }
    primary_accession { }
    accessions { [] }
    ec_numbers { [] }
    pdb_doi { }
    systematic_name { }
    molecular_weight { 12345 }
    add_attribute(:sequence) { "ABCDEFG" }
    link_uniprot { }
    heterologous_expression { 'unknown' }
    organism { }
    taxon_id { }
    strain { }
    tissue { }
    localisation { }
    protein_source_details_comments { }
    protein_source_details_expression_system { }
    deleted_at { }

    parent { nil }
    protein_sequence_modification { association :protein_sequence_modification }
    post_translational_modification { association :post_translational_modification }

    after(:build) do |sbmm, evaluator|
      if sbmm.uniprot_derivation == 'uniprot_modified'
        sbmm.parent = build(:uniprot_sbmm) unless sbmm.parent.present?
        sbmm.protein_sequence_modification = build(:protein_sequence_modification) unless sbmm.protein_sequence_modification.present?
        sbmm.post_translational_modification = build(:post_translational_modification) unless sbmm.post_translational_modification.present?
      end
    end

    factory(:uniprot_sbmm) do
      uniprot_source { File.read(Rails.root.join('spec/fixtures/uniprot/P12345.json')) }
      primary_accession { "P12345" }
      accessions { ["P12345", "G1SKL2"] }
      ec_numbers { ["2.6.1.1", "2.6.1.7"] }
      add_attribute(:sequence) { "MALLHSARVLSGVASAFHPGLAAAASARASSWWAHVEMGPPDPILGVTEAYKRDTNSKKMNLGVGAYRDDNGKPYVLPSVRKAEAQIAAKGLDKEYLPIGGLAEFCRASAELALGENSEVVKSGRFVTVQTISGTGALRIGASFLQRFFKFSRDVFLPKPSWGNHTPIFRDAGMQLQSYRYYDPKTCGFDFTGALEDISKIPEQSVLLLHACAHNPTGVDPRPEQWKEIATVVKKRNLFAFFDMAYQGFASGDGDKDAWAVRHFIEQGINVCLCQSYAKNMGLYGERVGAFTVICKDADEAKRVESQLKILIRPMYSNPPIHGARIASTILTSPDLRKQWLQEVKGMADRIIGMRTQLVSNLKKEGSTHSWQHITDQIGMFCFTGLKPEQVERLTKEFSIYMTKDGRISVAGVTSGNVGYLAHAIHQVTK" }
      link_uniprot { "https://www.uniprot.org/uniprotkb/P12345/entry" }
      organism { "Oryctolagus cuniculus" }
      taxon_id { "9986" }
    end

    factory(:modified_uniprot_sbmm) do
      uniprot_derivation { 'uniprot_modified' }
      parent { build(:uniprot_sbmm) }
      post_translational_modification do
        build(
          :post_translational_modification,
          phosphorylation_enabled: true,
          phosphorylation_ser_enabled: true,
          phosphorylation_ser_details: "Something something"
        )
      end
    end

    factory(:non_uniprot_sbmm) do
      uniprot_derivation { 'uniprot_unknown' }
    end
  end
end
