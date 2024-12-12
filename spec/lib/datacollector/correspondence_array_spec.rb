# frozen_string_literal: true

require 'rails_helper'

describe Datacollector::CorrespondenceArray do
  # Test the initialize method:
  # it create a new correspondence object when
  #   - a device or user can be found in the database with the given id as from argument
  #   - a device or user are passed as from argument
  # and
  #  - a user can be found in the database with the given id as to argument
  #  - a user is passed as to argument

  # set some users and devices for the tests
  #

  let(:person) { create(:person) }
  let(:unregistered_person) { build(:person) }
  let(:another_person) { create(:person) }
  let(:device) { create(:device) }
  let(:unregistered_device) { build(:device) }

  describe described_class do
    context 'when the sender is a device' do
      let(:correspondences) { described_class.new(device, [person]) }

      describe '.new' do
        it 'returns a new instance of the class' do
          expect(correspondences).to be_a(described_class)
        end

        it 'raises an error when correspondences has no sender' do
          expect { described_class.new(unregistered_device.email, [person]) }.to raise_error(Errors::DatacollectorError)
        end
      end

    describe '#recipients' do
      it 'returns the recipients' do
        expect(correspondences.recipients).to eq([person])
      end
    end

    describe '#sender' do
      it 'returns the sender' do
        expect(correspondences.sender).to eq(device)
      end
    end
      end
    context 'when the sender is not a device' do
      it 'raises an error when correspondences has no sender or the user sender is not sending to self' do
        expect { described_class.new(unregistered_person.email, [person]) }.to raise_error(Errors::DatacollectorError)
        expect { described_class.new(person, [another_person]) }.to raise_error(Errors::DatacollectorError)
      end

      it 'can only send to self' do
        expect(described_class.new(person, [person]).recipients).to eq([person])
        expect(described_class.new(person, []).recipients).to eq([person])
        expect(described_class.new(person, [another_person, person]).recipients).to eq([person])
      end
    end

    context 'when some recipients are not found' do
      let(:correspondences) { described_class.new(device, [unregistered_person.email, person.email]) }

      it 'ignores them' do
        expect(correspondences).to be_a(described_class)
        expect(correspondences.recipients).to eq([person])
      end
    end
  end
end
