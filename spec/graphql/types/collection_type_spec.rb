# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Types::CollectionType do
  subject { described_class }

  it_behaves_like 'a graphql base object'

  it { is_expected.to define_gql_field(:label).with_type(GraphQL::Types::String) }
  it { is_expected.not_to may_return_null(:label) }

  it { is_expected.to define_gql_field(:is_shared).with_type(GraphQL::Types::Boolean) }
  it { is_expected.not_to may_return_null(:is_shared) }

  it { is_expected.to define_gql_field(:permission_level).with_type(GraphQL::Types::Int) }
  it { is_expected.to define_gql_field(:sample_detail_level).with_type(GraphQL::Types::Int) }
  it { is_expected.to define_gql_field(:reaction_detail_level).with_type(GraphQL::Types::Int) }
  it { is_expected.to define_gql_field(:wellplate_detail_level).with_type(GraphQL::Types::Int) }
  it { is_expected.to define_gql_field(:researchplan_detail_level).with_type(GraphQL::Types::Int) }
  it { is_expected.to define_gql_field(:element_detail_level).with_type(GraphQL::Types::Int) }
  it { is_expected.to define_gql_field(:screen_detail_level).with_type(GraphQL::Types::Int) }

  it { is_expected.to define_gql_field(:position).with_type(GraphQL::Types::Int) }
  it { is_expected.to define_gql_field(:is_locked).with_type(GraphQL::Types::Boolean) }

  it { is_expected.to define_gql_field(:is_synchronized).with_type(GraphQL::Types::Boolean) }
  it { is_expected.not_to may_return_null(:is_synchronized) }
end
