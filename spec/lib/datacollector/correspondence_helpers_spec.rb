# frozen_string_literal: true

require 'rails_helper'

describe Datacollector::CorrespondenceHelpers do
  # set some users and devices for the tests
  #
  let(:user_person) { create(:person) }
  let(:user_group) { create(:group) }
  let(:user_admin) { create(:admin) }
  let(:device) { create(:device) }
  let(:device_eponyme) { create(:device, name_abbreviation: user_person.name_abbreviation) }

  # raw identifiers are made from an email addresses or a name_abbreviation:
  # - user names can be used as prefix to filenames
  # - name_abbreviations and emails addresses can be used as directory names

  let(:person_email_as_dir) do
    Pathname.new(Faker::File.dir(root: '/tmp', segment_count: 3)).join(user_person.email).to_s
  end
  let(:person_name_abbreviation_as_dir) do
    Pathname.new(Faker::File.dir(root: '/tmp', segment_count: 3)).join(user_person.name_abbreviation).to_s
  end
  let(:person_name_abbreviation_as_file_prefix) do
    "#{user_person.name_abbreviation}-#{File.basename(Faker::File.file_name(dir: ''))}"
  end

  let(:correspondence) { Class.new { extend Datacollector::CorrespondenceHelpers } }

  shared_examples 'find_user' do
    it 'finds the user' do
      expect(correspondence.find_user(identifier)).to eq(user)
    end
  end

  describe '.parse_identifier' do
    it 'extracts the name_abbreviation or email from a dir path or file name prefix' do
      expect(
        correspondence.send(:parse_identifier, person_email_as_dir),
      ).to eq(user_person.email)
      expect(
        correspondence.send(:parse_identifier, person_name_abbreviation_as_dir),
      ).to eq(user_person.name_abbreviation)
      expect(
        correspondence.send(:parse_identifier, person_name_abbreviation_as_file_prefix),
      ).to eq(user_person.name_abbreviation)
    end

    it 'returns the identifier when only the identifier is given' do
      %i[name_abbreviation email].each do |attribute|
        [user_person, user_group, user_admin, device].each do |subject|
          identifier = subject.send(attribute)
          expect(correspondence.send(:parse_identifier, identifier)).to eq(identifier)
        end
      end
    end
  end

  describe '.find_user' do
    %i[name_abbreviation email].each do |attribute|
      it "finds the user per #{attribute}" do
        [user_person, user_group].each do |subject|
          identifier = subject.send(attribute)
          expect(correspondence.find_user(identifier)).to eq(subject)
        end
      end

      it "does not find an admin per #{attribute}" do
        [user_admin].each do |user|
          identifier = user.send(attribute)
          expect(correspondence.find_user(identifier)).to be_nil
        end
      end
    end

    it 'does not find a user with a wrong name abbreviation' do
      false_name_abbreviation_long = user_person.name_abbreviation + Faker::Alphanumeric.alpha(number: 1)
      false_name_abbreviation_short = user_person.name_abbreviation[0..-2]
      [false_name_abbreviation_long, false_name_abbreviation_short].each do |false_name_abbreviation|
        expect(correspondence.find_user(false_name_abbreviation)).to be_nil
      end
    end
  end

  # @note atm, only email seems relevant to find devices as it is only used in mail collector
  describe '.find_device' do
    %i[name_abbreviation email].each do |attribute|
      it "finds a Device per #{attribute}" do
        expect(correspondence.find_device(device.name_abbreviation)).to eq(device)
      end
    end
  end

  describe '.find_sender' do
    context 'when a user and a device share the same name_abbreviation' do
      it 'finds the device over the user' do
        expect(user_person.name_abbreviation).to eq(device_eponyme.name_abbreviation)
        expect(correspondence.find_sender(user_person.name_abbreviation)).to eq(device_eponyme)
      end
    end
  end

  describe '.validate' do
    it 'returns true if the object is an activated Person account or a device' do
      [Person.new(account_active: true), Device.new].each do |object|
        expect(correspondence.validate(object)).to be_truthy
      end
    end

    it 'returns false if the user is not activated or an admin' do
      [Person.new(account_active: false), Admin.new(account_active: true)].each do |user|
        expect(correspondence.validate(user)).to be_falsey
      end
    end
  end
end
