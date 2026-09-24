# frozen_string_literal: true

# == Schema Information
#
# Table name: research_plans
#
#  id          :integer          not null, primary key
#  body        :jsonb
#  created_by  :integer          not null
#  deleted_at  :datetime
#  name        :string           not null
#  short_label :string
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
require 'rails_helper'

RSpec.describe ResearchPlan, type: :model do
  describe 'creation' do
    let(:research_plan) { create(:research_plan) }

    it 'is possible to create a valid research plan' do
      expect(research_plan.valid?).to be(true)
    end

    it 'is invalid if name is blank' do
      research_plan.name = nil
      expect(research_plan.valid?).to be(false)
    end

    it 'is invalid if creator is blank' do
      research_plan.creator = nil
      expect(research_plan.valid?).to be(false)
    end

    it 'has correct short label' do
      expected_label = "#{research_plan.creator.name_abbreviation}-RP1"
      expect(research_plan.short_label).to eq(expected_label)
    end
  end

  describe 'associations' do
    it { is_expected.to belong_to(:creator).class_name('User') }
    it { is_expected.to have_one(:container) }
    it { is_expected.to have_one(:research_plan_metadata).dependent(:destroy) }
    it { is_expected.to have_many(:collections).through(:collections_research_plans) }
    it { is_expected.to have_many(:wellplates).through(:research_plans_wellplates) }
    it { is_expected.to have_many(:screens).through(:research_plans_screens) }
    it { is_expected.to have_many(:literatures).through(:literals) }
    it { is_expected.to have_many(:comments).dependent(:destroy) }
  end

  describe '#set_short_label' do
    let(:creator) { create(:person) }

    it 'numbers the research plans of a creator consecutively' do
      create(:research_plan, creator: creator)
      second = create(:research_plan, creator: creator)

      expect(second.short_label).to eq "#{creator.name_abbreviation}-RP2"
      expect(creator.reload.counters['research_plans']).to eq '2'
    end
  end

  describe 'after_create :create_root_container' do
    let(:research_plan) { create(:research_plan) }

    it 'creates a root container with an analyses child' do
      expect(research_plan.container).to have_attributes(container_type: 'root')
      expect(research_plan.container.children.pluck(:container_type)).to eq %w[analyses]
    end

    it 'keeps an existing container' do
      container = research_plan.container
      research_plan.create_root_container

      expect(research_plan.container).to eq container
    end
  end

  describe '#analyses' do
    it 'returns the analyses of the container' do
      research_plan = create(:research_plan)
      research_plan.container.analyses_container.create_analysis_with_dataset!(name: 'NMR')

      expect(research_plan.analyses.map(&:name)).to eq %w[NMR]
    end

    it 'returns an empty relation without container' do
      expect(described_class.new.analyses).to eq Container.none
    end
  end

  describe '#preview_attachment' do
    let(:research_plan) { create(:research_plan) }

    it 'prefers the first image attachment' do
      create(:attachment, attachable: research_plan)
      image = create(:attachment, :with_image, attachable: research_plan)

      expect(research_plan.reload.preview_attachment).to eq image
    end

    it 'falls back to the first attachment without images' do
      text = create(:attachment, attachable: research_plan)

      expect(research_plan.reload.preview_attachment).to eq text
    end

    it 'returns nil without attachments' do
      expect(research_plan.preview_attachment).to be_nil
    end
  end

  describe '#svg_files' do
    it 'returns the svg files of the ketcher fields only' do
      research_plan = build(
        :research_plan,
        body: [
          { 'id' => '1', 'type' => 'ketcher', 'value' => { 'svg_file' => 'a.svg' } },
          { 'id' => '2', 'type' => 'richtext', 'value' => { 'ops' => [] } },
          { 'id' => '3', 'type' => 'ketcher', 'value' => { 'svg_file' => 'b.svg' } },
        ],
      )

      expect(research_plan.svg_files).to eq %w[a.svg b.svg]
    end
  end

  describe '#update_body_attachments' do
    let(:research_plan) { create(:research_plan, :with_image_field) }
    let(:field) { research_plan.reload.body.first }

    it 'replaces the public name and id of the matching image field' do
      original_id = research_plan.body.first['id']
      research_plan.update_body_attachments('800ee110-3420-11ed-af52-2bf1404da86a', 'copy-identifier')

      expect(field['value']['public_name']).to eq 'copy-identifier'
      expect(field['id']).not_to eq original_id
    end

    it 'leaves the body untouched when no field matches' do
      body = research_plan.body.deep_dup
      research_plan.update_body_attachments('unknown', 'copy-identifier')

      expect(research_plan.reload.body).to eq body
    end
  end

  describe 'before_destroy :delete_attachment' do
    it 'destroys the attachments outside production' do
      research_plan = create(:research_plan)
      attachment = create(:attachment, attachable: research_plan)
      research_plan.destroy

      expect(Attachment.find_by(id: attachment.id)).to be_nil
    end
  end

  describe 'scopes' do
    let(:sample) { create(:sample) }
    let(:reaction) { create(:reaction) }
    let!(:plan_with_sample) do
      create(:research_plan, name: 'Sample Plan',
                             body: [{ 'type' => 'sample', 'value' => { 'sample_id' => sample.id } }])
    end
    let!(:plan_with_reaction) do
      create(:research_plan, name: 'Reaction Plan',
                             body: [{ 'type' => 'reaction', 'value' => { 'reaction_id' => reaction.id } }])
    end

    describe '.by_name' do
      it 'finds research plans by a case-insensitive name fragment' do
        expect(described_class.by_name('sample pl')).to eq [plan_with_sample]
      end

      it 'treats LIKE wildcards literally' do
        expect(described_class.by_name('%')).to be_empty
      end
    end

    describe '.by_sample_ids' do
      it 'finds research plans embedding the given samples' do
        expect(described_class.by_sample_ids([sample.id])).to eq [plan_with_sample]
      end
    end

    describe '.by_reaction_ids' do
      it 'finds research plans embedding the given reactions' do
        expect(described_class.by_reaction_ids([reaction.id])).to eq [plan_with_reaction]
      end
    end

    describe '.sample_ids_by_research_plan_ids' do
      it 'returns the embedded sample ids' do
        ids = described_class.sample_ids_by_research_plan_ids([plan_with_sample.id, plan_with_reaction.id])

        expect(ids.map(&:sample_id)).to eq [sample.id.to_s]
      end
    end

    describe '.reaction_ids_by_research_plan_ids' do
      it 'returns the embedded reaction ids' do
        ids = described_class.reaction_ids_by_research_plan_ids([plan_with_sample.id, plan_with_reaction.id])

        expect(ids.map(&:reaction_id)).to eq [reaction.id.to_s]
      end
    end

    describe '.by_literature_ids' do
      it 'finds research plans citing the given literature' do
        literature = create(:literature)
        create(:literal, literature: literature, element: plan_with_sample)

        expect(described_class.by_literature_ids([literature.id])).to eq [plan_with_sample]
      end
    end
  end
end
