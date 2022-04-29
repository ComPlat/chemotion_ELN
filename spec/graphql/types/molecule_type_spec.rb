# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Types::MoleculeType do
  subject { described_class }

  it_behaves_like 'a graphql base object'

  it { is_expected.to define_gql_field(:inchikey).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:inchistring).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:density).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:molecular_weight).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:molfile).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:melting_point).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:boiling_point).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:sum_formular).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:names).with_type(GraphQL::Types::String).as_list }
  it { is_expected.to define_gql_field(:iupac_name).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:molecule_svg_file).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:is_partial).with_type(GraphQL::Types::Boolean) }
  it { is_expected.to define_gql_field(:exact_molecular_weight).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:cano_smiles).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:cas).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:molfile_version).with_type(GraphQL::Types::String) }
end
