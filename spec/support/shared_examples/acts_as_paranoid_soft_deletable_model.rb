# frozen_string_literal: true

# Shared specs for models with the `acts_as_paranoid` features.
RSpec.shared_examples 'acts_as_paranoid soft-deletable model' do |factory_name|
  it { is_expected.to have_db_column(:deleted_at) }

  describe 'has scopes' do
    it '.only_deleted' do
      expect(described_class).to respond_to(:only_deleted)
    end
    it '.with_deleted' do
      expect(described_class).to respond_to(:with_deleted)
    end
  end

  context 'deleting instance' do
    let(:factory_class) { factory_name || described_class.to_s.underscore.to_sym }
    subject { create(factory_class) }

    it 'only soft-deletes' do
      expect { subject.destroy }.to change {
        subject.deleted_at
      }.from(nil).to(
        # destroying can take up to 2 seconds!
        within(2.seconds).of(Time.zone.now),
      )
    end
  end
end
