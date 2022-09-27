# frozen_string_literal: true

RSpec.shared_examples 'a secured graphql resolver' do
  describe '#ready?' do
    subject(:ready?) { mutation.ready? }

    let(:mutation) { described_class.new(object: {}, context: { current_user: current_user }, field: nil) }

    context 'when current_user is present' do
      let(:current_user) { build(:user) }

      it 'returns true' do
        expect(ready?).to eq(true)
      end
    end

    context 'when current_user is missing' do
      let(:current_user) { nil }

      it 'returns raises an error' do
        expect { ready? }.to raise_error(Errors::AuthenticationError)
      end
    end
  end
end
