# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Types::SampleType do
  subject { described_class }

  it_behaves_like 'a graphql base object'

  it { is_expected.to define_gql_field(:name).with_type(GraphQL::Types::String) }
  it { is_expected.to may_return_null(:name) }

  it { is_expected.to define_gql_field(:target_amount_value).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:target_amount_unit).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:description).with_type(GraphQL::Types::String) }

  it { is_expected.to define_gql_field(:molfile).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:purity).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:deprecated_solvent).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:impurities).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:location).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:is_top_secret).with_type(GraphQL::Types::Boolean) }
  it { is_expected.to define_gql_field(:external_label).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:short_label).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:real_amount_value).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:real_amount_unit).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:imported_readout).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:sample_svg_file).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:identifier).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:density).with_type(GraphQL::Types::Float) }

  it { is_expected.to define_gql_field(:melting_point).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:boiling_point).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:xref).with_type(GraphQL::Types::JSON) }
  it { is_expected.to define_gql_field(:molarity_value).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:molarity_unit).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:molfile_version).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:stereo).with_type(GraphQL::Types::JSON) }
  it { is_expected.to define_gql_field(:metrics).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:decoupled).with_type(GraphQL::Types::Boolean) }
  it { is_expected.to define_gql_field(:molecular_mass).with_type(GraphQL::Types::Float) }
  it { is_expected.to define_gql_field(:sum_formula).with_type(GraphQL::Types::String) }
  it { is_expected.to define_gql_field(:solvent).with_type(GraphQL::Types::JSON) }
  it { is_expected.to define_gql_field(:molecule).with_type(Types::MoleculeType) }
end
