# frozen_string_literal: true

# == Schema Information
#
# Table name: profiles
#
#  id                      :integer          not null, primary key
#  show_external_name      :boolean          default(FALSE)
#  user_id                 :integer          not null
#  deleted_at              :datetime
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  data                    :jsonb            not null
#  curation                :integer          default(2)
#  show_sample_name        :boolean          default(FALSE)
#  show_sample_short_label :boolean          default(FALSE)
#
# Indexes
#
#  index_profiles_on_deleted_at  (deleted_at)
#  index_profiles_on_user_id     (user_id)
#
require 'rails_helper'

RSpec.describe Profile do
  let(:person) { create(:person) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'soft delete' do
    it 'keeps the row when destroyed' do
      profile = person.profile
      profile.destroy

      expect(described_class.with_deleted.find(profile.id).deleted_at).to be_present
    end
  end

  describe 'before_create :set_default' do
    context 'when the user is a Person' do
      subject(:data) { described_class.create!(user: person).data }

      it 'sets the boolean feature flags to their defaults' do
        expect(data).to include(
          'is_templates_moderator' => false, 'molecule_editor' => false, 'converter_admin' => false,
          'inbox_auto' => false, 'inbox_manual' => true, 'global_text_template_editor' => false
        )
      end

      it 'loads the default CHMO terms' do
        terms = JSON.parse(Rails.root.join('db/chmo.default.profile.json').read(encoding: 'bom|utf-8'))
        expect(data['chmo']).to eq terms['ols_terms']
      end

      it 'sets the configured default layout' do
        expect(data['layout']).to eq described_class.default_layout
      end
    end

    context 'when the Person already brings a layout' do
      it 'keeps the given layout' do
        profile = described_class.create!(user: person, data: { 'layout' => { 'sample' => 7 } })

        expect(profile.data['layout']).to eq('sample' => 7)
      end
    end

    context 'when no default layout is configured' do
      before { allow(described_class).to receive(:default_layout).and_return({}) }

      it 'does not persist a blank layout' do
        profile = described_class.create!(user: person)

        expect(profile.data).not_to have_key('layout')
      end
    end

    context 'when the user is not a Person' do
      it 'leaves the data untouched' do
        profile = described_class.create!(user: create(:group))

        expect(profile.data).to eq({})
      end
    end
  end

  describe '.novnc' do
    let!(:with_novnc) do
      create(:person).profile.tap { |p| p.update!(data: p.data.merge('novnc' => { 'token' => 'x' })) }
    end

    it 'returns only profiles with novnc settings' do
      person.profile

      expect(described_class.novnc).to contain_exactly(with_novnc)
    end
  end

  describe '#computed_props' do
    let(:profile) { person.profile }

    it 'returns the computed_props section of data' do
      profile.update!(data: profile.data.merge('computed_props' => { 'enable' => true }))

      expect(profile.computed_props).to eq('enable' => true)
    end

    it 'returns nil when the section is missing' do
      expect(profile.computed_props).to be_nil
    end

    it 'returns nil when data is nil' do
      profile.data = nil

      expect(profile.computed_props).to be_nil
    end
  end

  describe '#enable_computed_props' do
    let(:profile) { person.profile }

    it 'persists enable: true' do
      profile.enable_computed_props

      expect(profile.reload.computed_props).to eq('enable' => true)
    end

    it 'keeps other computed_props keys and the rest of data' do
      profile.update!(data: profile.data.merge('computed_props' => { 'enable' => false, 'other' => 1 }))
      profile.enable_computed_props

      expect(profile.reload.computed_props).to eq('enable' => true, 'other' => 1)
      expect(profile.data['inbox_manual']).to be true
    end

    it 'initialises data when it is nil' do
      profile.data = nil
      profile.enable_computed_props

      expect(profile.reload.data).to eq('computed_props' => { 'enable' => true })
    end
  end

  describe '#disabled_computed_props' do
    let(:profile) { person.profile }

    it 'persists enable: false' do
      profile.update!(data: profile.data.merge('computed_props' => { 'enable' => true }))
      profile.disabled_computed_props

      expect(profile.reload.computed_props).to eq('enable' => false)
    end

    it 'creates the section when it is missing' do
      profile.disabled_computed_props

      expect(profile.reload.computed_props).to eq('enable' => false)
    end

    it 'initialises data when it is nil' do
      profile.data = nil
      profile.disabled_computed_props

      expect(profile.reload.data).to eq('computed_props' => { 'enable' => false })
    end
  end

  describe '.default_layout' do
    let(:config) { ActiveSupport::OrderedOptions.new }

    it 'returns the configured layout with string keys' do
      config.layout = { layout: { sample: 1, reaction: 2 } }
      allow(Rails.configuration).to receive(:profile_default).and_return(config)

      expect(described_class.default_layout).to eq('sample' => 1, 'reaction' => 2)
    end

    it 'returns a copy that cannot corrupt the configuration' do
      config.layout = { layout: { sample: 1 } }
      allow(Rails.configuration).to receive(:profile_default).and_return(config)
      described_class.default_layout['sample'] = 99

      expect(config.layout[:layout]).to eq(sample: 1)
    end

    it 'returns an empty hash when the layout section is missing' do
      config.layout = {}
      allow(Rails.configuration).to receive(:profile_default).and_return(config)

      expect(described_class.default_layout).to eq({})
    end

    it 'returns an empty hash when profile_default is not configured' do
      allow(Rails.configuration).to receive(:respond_to?).and_call_original
      allow(Rails.configuration).to receive(:respond_to?).with(:profile_default).and_return(false)

      expect(described_class.default_layout).to eq({})
    end
  end
end
