# frozen_string_literal: true

RSpec.shared_context 'a graphql base object' do
  subject { described_class }

  it { is_expected.to define_gql_field(:id).with_type(GraphQL::Types::Int) }
  it { is_expected.not_to may_return_null(:id) }

  it { is_expected.to define_gql_field(:created_at).with_type(GraphQL::Types::ISO8601DateTime) }
  it { is_expected.not_to may_return_null(:created_at) }

  it { is_expected.to define_gql_field(:updated_at).with_type(GraphQL::Types::ISO8601DateTime) }
  it { is_expected.not_to may_return_null(:updated_at) }
end
