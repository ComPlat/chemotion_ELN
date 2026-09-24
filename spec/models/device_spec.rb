# frozen_string_literal: true

# == Schema Information
#
# Table name: devices
#
#  id                                :bigint           not null, primary key
#  account_active                    :boolean          default(FALSE)
#  datacollector_authentication      :string
#  datacollector_dir                 :string
#  datacollector_host                :string
#  datacollector_key_name            :string
#  datacollector_method              :string
#  datacollector_number_of_files     :string
#  datacollector_user                :string
#  datacollector_user_level_selected :boolean          default(FALSE)
#  deleted_at                        :datetime
#  email                             :string
#  first_name                        :string
#  last_name                         :string
#  name                              :string
#  name_abbreviation                 :string
#  novnc_password                    :string
#  novnc_target                      :string
#  novnc_token                       :string
#  serial_number                     :string
#  verification_status               :string           default("none")
#  visibility                        :boolean          default(FALSE)
#  created_at                        :datetime         not null
#  updated_at                        :datetime         not null
#
# Indexes
#
#  index_devices_on_deleted_at         (deleted_at)
#  index_devices_on_email              (email) UNIQUE
#  index_devices_on_name_abbreviation  (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#
require 'rails_helper'

RSpec.describe Device do
  let(:user) { create(:person) }
  let(:device) { create(:device) }
  let(:device_with_novnc) { create(:device, :novnc_settings) }

  before do
    device.people << user
    device.save!
  end

  it 'handles user device relationship correctly' do
    expect(device.users).to eq Person.where id: user.id
  end

  describe '.encrypt_novnc_password' do
    before do
      device_with_novnc.update!({ novnc_password: 'testen' })
    end

    it 'returns an encryted novnc password' do
      expect(device_with_novnc.novnc_password).not_to eq('testen')
    end
  end

  describe '.decrypted_novnc_password' do
    before do
      device_with_novnc.update!({ novnc_password: 'testen' })
    end

    it 'returns a decrypted novnc password' do
      expect(device_with_novnc.decrypted_novnc_password).to eq('testen')
    end
  end

  describe '#destroy' do
    it 'keeps the soft-deleted record but releases its unique fields' do
      device.destroy
      deleted = described_class.only_deleted.find(device.id)

      expect(deleted.name_abbreviation).to be_nil
      expect(deleted.email).to be_nil
    end

    it 'frees the name abbreviation and email for a new device' do
      abbreviation = device.name_abbreviation
      email = device.email
      device.destroy

      new_device = build(:device, name_abbreviation: abbreviation, email: email)
      expect(new_device).to be_valid
      expect { new_device.save! }.not_to raise_error
    end
  end

  describe 'name abbreviation uniqueness' do
    it 'rejects an abbreviation that differs only in case' do
      taken = create(:device, name_abbreviation: 'Ab_c')

      duplicate = build(:device, name_abbreviation: taken.name_abbreviation.upcase)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors.of_kind?(:name_abbreviation, :taken)).to be true
    end

    it 'lets a device change the case of its own abbreviation' do
      device.name_abbreviation = device.name_abbreviation.swapcase

      expect(device).to be_valid
    end

    it 'adds errors instead of raising when the abbreviation is missing' do
      new_device = described_class.new(name: 'x')

      expect(new_device).not_to be_valid
      expect(new_device.errors[:name_abbreviation]).to be_present
    end

    it 'still saves other changes to a device whose abbreviation is already duplicated' do
      create(:device, name_abbreviation: 'NMR_1')
      legacy = create(:device, name_abbreviation: 'Nmr_x')
      legacy.update_column(:name_abbreviation, 'nmr_1') # rubocop:disable Rails/SkipsModelValidations

      expect(legacy.reload.update(serial_number: '42')).to be true
    end

    it 'rejects clearing the abbreviation of an existing device' do
      [nil, ''].each do |blank|
        device.name_abbreviation = blank

        expect(device).not_to be_valid
        expect(device.errors.details[:name_abbreviation]).to eq [{ error: :blank }]
      end
    end

    it 'rejects an empty abbreviation that is already in use' do
      device.update_column(:name_abbreviation, '') # rubocop:disable Rails/SkipsModelValidations
      other = create(:device)
      other.name_abbreviation = ''

      expect(other).not_to be_valid
      expect(other.errors.of_kind?(:name_abbreviation, :taken)).to be true
      expect(other.errors.messages[:name_abbreviation]).to include 'Is already in use'
    end

    it 'can validate a soft-deleted device' do
      device.destroy

      expect { described_class.only_deleted.find(device.id).valid? }.not_to raise_error
    end
  end

  describe 'sftp keyfile validation' do
    let(:keydir) { Dir.mktmpdir }
    let(:sftp_device) do
      build(:device, datacollector_method: 'filewatchersftp', datacollector_dir: '/data',
                     datacollector_user: 'user', datacollector_host: 'host',
                     datacollector_authentication: 'keyfile', datacollector_key_name: 'id_test')
    end

    before { allow(Rails.configuration.datacollectors).to receive(:keydir).and_return(keydir) }

    after { FileUtils.remove_entry(keydir) }

    it 'accepts an existing key file' do
      FileUtils.touch(File.join(keydir, 'id_test'))

      expect(sftp_device).to be_valid
    end

    it 'reports a key file that does not exist' do
      expect(sftp_device).not_to be_valid
      expect(sftp_device.errors.details[:datacollector_key_name]).to eq [{ error: :not_found }]
    end

    it 'reports a missing key name as blank' do
      sftp_device.datacollector_key_name = nil

      expect(sftp_device).not_to be_valid
      expect(sftp_device.errors.details[:datacollector_key_name]).to eq [{ error: :blank }]
    end

    it 'reports the key file as not found when no key directory is configured' do
      allow(Rails.configuration.datacollectors).to receive(:keydir).and_return(nil)

      expect(sftp_device).not_to be_valid
      expect(sftp_device.errors.details[:datacollector_key_name]).to eq [{ error: :not_found }]
    end
  end

  describe 'associations' do
    it { is_expected.to have_many(:users).through(:users_devices) }
    it { is_expected.to have_many(:groups).through(:users_devices) }
    it { is_expected.to have_one(:device_metadata).dependent(:destroy) }
    it { is_expected.to have_many(:device_descriptions).dependent(:nullify) }
  end

  describe 'validations' do
    it 'requires a name' do
      expect(build(:device, name: nil)).not_to be_valid
    end

    it 'rejects an email that is already taken' do
      duplicate = build(:device, email: device.email)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to include 'already exists'
    end

    it 'allows several devices without email' do
      create(:device, email: '')

      expect(build(:device, email: '')).to be_valid
    end
  end

  describe 'name abbreviation rules on create' do
    subject(:new_device) { build(:device, name_abbreviation: abbreviation) }

    context 'with a leading digit' do
      let(:abbreviation) { '1ABC' }

      it 'is invalid' do
        expect(new_device).not_to be_valid
        expect(new_device.errors[:name_abbreviation].join).to include("leading digit, or trailing '-' and '_'")
      end
    end

    context 'with a trailing dash' do
      let(:abbreviation) { 'ABC-' }

      it { is_expected.not_to be_valid }
    end

    context 'with a middle dash and underscore' do
      let(:abbreviation) { 'A-B_C' }

      it { is_expected.to be_valid }
    end

    context 'when shorter than the default minimum of 2' do
      let(:abbreviation) { 'A' }

      it 'is invalid with a wrong length error' do
        expect(new_device).not_to be_valid
        expect(new_device.errors.details[:name_abbreviation]).to include(error: :wrong_length, min: 2, max: 5)
      end
    end

    context 'when longer than the default maximum of 5' do
      let(:abbreviation) { 'ABCDEF' }

      it { is_expected.not_to be_valid }
    end

    it 'is not checked when updating an existing device' do
      device.update_column(:name_abbreviation, 'TOOLONG1') # rubocop:disable Rails/SkipsModelValidations

      expect(device).to be_valid
    end
  end

  describe 'configured name abbreviation rules' do
    let(:new_device) { build(:device, name_abbreviation: abbreviation) }
    let(:config) do
      {
        reserved_list: %w[CRR],
        length_device: [2, 8],
        format_abbr: /\A[A-Z]+\z/,
        format_abbr_err_msg: 'only capitals',
      }
    end

    before { allow(new_device).to receive(:name_abbr_config).and_return(config) }

    context 'with a reserved abbreviation' do
      let(:abbreviation) { 'CRR' }

      it 'is invalid' do
        expect(new_device).not_to be_valid
        expect(new_device.errors.details[:name_abbreviation]).to include(error: :reserved)
      end
    end

    context 'with an abbreviation allowed by the configured length' do
      let(:abbreviation) { 'ABCDEFGH' }

      it { expect(new_device).to be_valid }
    end

    context 'with an abbreviation not matching the configured format' do
      let(:abbreviation) { 'Abc' }

      it 'uses the configured error message' do
        expect(new_device).not_to be_valid
        expect(new_device.errors[:name_abbreviation]).to include 'only capitals'
      end
    end
  end

  describe '#name_abbr_config' do
    it 'falls back to an empty hash without user props configuration' do
      allow(Rails.configuration).to receive(:user_props).and_return(nil)

      expect(described_class.new.name_abbr_config).to eq({})
    end
  end

  describe '#mail_checker' do
    it 'accepts a blank email' do
      expect(described_class.new(email: '').mail_checker).to be true
    end

    it 'rejects emails from throwaway providers' do
      disposable = build(:device, email: 'someone@mailinator.com')

      expect(disposable).not_to be_valid
      expect(disposable.errors[:email]).to include 'from throwable email providers not accepted'
    end
  end

  describe '#datacollector_values_present?' do
    it 'is true when no datacollector attribute is set' do
      expect(described_class.new.datacollector_values_present?).to be true
    end

    it 'is false as soon as one datacollector attribute is set' do
      expect(described_class.new(datacollector_user: 'me').datacollector_values_present?).to be false
    end
  end

  describe '#datacollector_sftp_values_present?' do
    let(:attributes) do
      { datacollector_method: 'filewatchersftp', datacollector_dir: '/data',
        datacollector_user: 'me', datacollector_host: 'host' }
    end

    it 'is true when all sftp attributes are set' do
      expect(described_class.new(attributes).datacollector_sftp_values_present?).to be true
    end

    it 'is false when one sftp attribute is missing' do
      expect(described_class.new(attributes.merge(datacollector_host: nil)).datacollector_sftp_values_present?)
        .to be false
    end
  end

  describe 'datacollector validations' do
    it 'are skipped when no datacollector attribute is set' do
      expect(build(:device)).to be_valid
    end

    it 'require a method and a directory once a datacollector attribute is set' do
      partial = build(:device, datacollector_user: 'me')

      expect(partial).not_to be_valid
      expect(partial.errors.details[:datacollector_method]).to include(error: :blank)
      expect(partial.errors.details[:datacollector_dir]).to include(error: :blank)
    end

    it 'require a user and a host for sftp methods' do
      sftp = build(:device, datacollector_method: 'filewatchersftp', datacollector_dir: '/data')

      expect(sftp).not_to be_valid
      expect(sftp.errors.details[:datacollector_user]).to include(error: :blank)
      expect(sftp.errors.details[:datacollector_host]).to include(error: :blank)
    end

    it 'require a key name for keyfile authentication' do
      keyfile = build(:device, datacollector_method: 'filewatcherlocal', datacollector_authentication: 'keyfile')

      expect(keyfile).not_to be_valid
      expect(keyfile.errors.details[:datacollector_key_name]).to include(error: :blank)
    end

    it 'reject a local directory that does not exist' do
      local = build(:device, datacollector_method: 'filewatcherlocal', datacollector_dir: '/does/not/exist')

      expect(local).not_to be_valid
      expect(local.errors.details[:datacollector_dir]).to include(error: :invalid)
    end

    it 'reject an existing local directory outside the allowlist' do
      Dir.mktmpdir do |dir|
        local = build(:device, datacollector_method: 'filewatcherlocal', datacollector_dir: dir)

        expect(local).not_to be_valid
        expect(local.errors.details[:datacollector_dir]).to include(error: :whitelist)
      end
    end

    it 'accept a local directory inside the allowlist' do
      expect(create(:device, :file_local)).to be_valid
    end
  end

  describe '#datacollector_pathname' do
    it 'returns nil without directory' do
      expect(described_class.new.datacollector_pathname).to be_nil
    end

    it 'returns the directory as Pathname' do
      expect(described_class.new(datacollector_dir: '/data').datacollector_pathname).to eq Pathname.new('/data')
    end
  end

  describe '#datacollector_localpath_config' do
    it 'returns the directory relative to the matching allowlisted path' do
      local = create(:device, :file_local)
      root = Rails.configuration.datacollectors.localcollectors.first[:path]
      expected = Pathname.new(local.datacollector_dir).realpath.to_path.sub(root, '')

      expect(local.datacollector_localpath_config).to eq expected
    end

    it 'returns nil for a directory that does not exist' do
      expect(described_class.new(datacollector_dir: '/does/not/exist').datacollector_localpath_config).to be_nil
    end
  end

  describe '#datacollector_key_dir_path' do
    let(:keyed) { described_class.new(datacollector_key_name: 'id_key') }

    it 'returns nil without key name' do
      expect(described_class.new.datacollector_key_dir_path).to be_nil
    end

    it 'joins an absolute key directory with the key name' do
      allow(Rails.configuration.datacollectors).to receive(:keydir).and_return('/keys')

      expect(keyed.datacollector_key_dir_path).to eq Pathname.new('/keys/id_key')
    end

    it 'resolves a relative key directory against the Rails root' do
      allow(Rails.configuration.datacollectors).to receive(:keydir).and_return('config/keys')

      expect(keyed.datacollector_key_dir_path).to eq Rails.root.join('config/keys/id_key')
    end

    it 'returns nil without configured key directory' do
      allow(Rails.configuration.datacollectors).to receive(:keydir).and_return(nil)

      expect(keyed.datacollector_key_dir_path).to be_nil
    end
  end

  describe '#initials' do
    it 'returns the name abbreviation' do
      expect(device.initials).to eq device.name_abbreviation
    end
  end

  describe '#info' do
    it 'describes the device by id and name' do
      expect(device.info).to eq "Device ID: #{device.id}, Name: #{device.name}"
    end
  end

  describe '#encrypt_novnc_password' do
    it 'stores an empty string when no password is given' do
      expect(device_with_novnc.novnc_password).to eq ''
    end
  end

  describe '#decrypted_novnc_password' do
    it 'returns nil without password' do
      expect(device.decrypted_novnc_password).to be_nil
    end

    it 'returns a value that cannot be decrypted unchanged' do
      expect(described_class.new(novnc_password: 'plain').decrypted_novnc_password).to eq 'plain'
    end
  end

  describe '#normalize_email' do
    it 'stores a blank email as nil' do
      expect(create(:device, email: '').reload.email).to be_nil
    end
  end

  describe 'scopes' do
    describe '.by_name' do
      it 'finds devices by a case-insensitive name fragment' do
        named = create(:device, name: 'Big NMR Spectrometer')

        expect(described_class.by_name('nmr spec')).to eq [named]
      end
    end

    describe '.by_email' do
      it 'finds devices by case-insensitive email' do
        expect(described_class.by_email(" #{device.email.upcase} ")).to eq [device]
      end
    end

    describe '.by_user_ids' do
      it 'finds the devices assigned to the given users' do
        create(:device)

        expect(described_class.by_user_ids([user.id])).to eq [device]
      end
    end
  end
end
