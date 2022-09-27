# frozen_string_literal: true

RSpec.shared_examples 'a graphql resolver for single object' do
  subject { described_class }

  it { is_expected.to define_gql_argument(:id).with_type(GraphQL::Types::ID).required! }

  describe '#resolve' do
    let(:resolver) { described_class.new(object: {}, context: {}, field: nil) }

    let(:params) { { id: 1 } }

    before do
      allow(model_class).to receive(:find_by!)
    end

    it 'finds the object by id' do
      resolver.resolve(params)

      expect(model_class).to have_received(:find_by!).with(**params).once
    end
  end
end
