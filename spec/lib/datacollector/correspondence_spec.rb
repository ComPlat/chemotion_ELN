# frozen_string_literal: true

require 'rails_helper'

describe Datacollector::Correspondence do
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
  let(:device) { create(:device, :file_local, user_identifiers: [person.name_abbreviation]) }

  # rubocop:disable RSpec/NestedGroups
  describe described_class do
    subject(:correspondence) { described_class.new(device, person) }

    # rubocop:disable RSpec/BeforeAfterAll
    after(:all) do
      Pathname.new(Rails.configuration.datacollectors.dig(:localcollectors, 0, :path)).rmtree
    end
    # rubocop:enable RSpec/BeforeAfterAll

    describe '.new' do
      it 'returns a new instance of the class' do
        expect(correspondence).to be_a(described_class)
      end

      it 'has prepared the containers for the recipient' do
        container = correspondence.sender_container
        expect(container).to be_a(Container)
        expect(person.container.descendants).to include(container)
      end

      context 'when the arguments are not valid' do
        subject(:correspondence) { described_class.new(device, device) }

        it 'raises a Errors::DatacollectorError' do
          expect { correspondence }.to raise_error(Errors::DatacollectorError)
        end
      end
    end
    # rubocop:enable RSpec/NestedGroups

    describe '#sender_container' do
      it 'has the proper name and container_type' do
        container = correspondence.sender_container
        expect(container.name).to eq(device.name)
        expect(container.container_type).to eq(correspondence.send(:build_sender_box_id, device.id))
      end
    end

    describe '#sender' do
      it 'returns the sender' do
        expect(correspondence.sender).to eq(device)
      end
    end

    describe '#recipient' do
      it 'returns the recipient' do
        expect(correspondence.recipient).to eq(person)
      end
    end

    describe 'attaching a file' do
      subject(:correspondence) { described_class.new(device, person) }

      it 'attaches a file to the correspondence' do
        file = Pathname.new(device.datacollector_dir).glob('*').first
        name = file.basename.to_s
        correspondence.attach(name, file.to_s)
        attachment = correspondence.sender_container.descendants.filter_map(&:attachments).flatten.first

        expect(attachment.filename).to eq(name)
      end
    end
  end
end
