# frozen_string_literal: true

# == Schema Information
#
# Table name: containers
#
#  id                 :integer          not null, primary key
#  ancestry           :string
#  containable_type   :string
#  container_type     :string
#  deleted_at         :datetime
#  description        :text
#  extended_metadata  :hstore
#  name               :string
#  plain_text_content :text
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  containable_id     :integer
#  parent_id          :integer
#
# Indexes
#
#  index_containers_on_containable  (containable_type,containable_id)
#  index_containers_on_parent_id    (parent_id) WHERE (deleted_at IS NULL)
#
require 'rails_helper'

RSpec.describe Container, type: :model do
  describe '.create_root_container' do
    subject(:root) { described_class.create_root_container }

    it 'creates a root container with an analyses child' do
      expect(root).to have_attributes(name: 'root', container_type: 'root')
      expect(root.children.pluck(:container_type)).to eq %w[analyses]
    end

    it 'passes extra attributes to the root container' do
      sample = create(:sample)
      root = described_class.create_root_container(containable: sample)

      expect(root.containable).to eq sample
    end
  end

  describe 'analysis helpers' do
    let(:root) { described_class.create_root_container }
    let(:analyses) { root.analyses_container }

    before { analyses.create_analysis_with_dataset!(name: 'NMR') }

    describe '#analyses_container' do
      it 'returns the analyses child' do
        expect(analyses.container_type).to eq 'analyses'
      end

      it 'raises when no analyses child exists' do
        bare = create(:container)

        expect { bare.analyses_container }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end

    describe '#create_analysis_with_dataset!' do
      it 'creates an analysis with a dataset of the same name' do
        analysis = analyses.children.first

        expect(analysis).to have_attributes(container_type: 'analysis', name: 'NMR')
        expect(analysis.children.map { |c| [c.container_type, c.name] }).to eq [%w[dataset NMR]]
      end
    end

    describe '#analyses' do
      it 'returns the analysis containers two generations below the root' do
        expect(root.analyses.map(&:name)).to eq %w[NMR]
      end
    end
  end

  describe '#root_element' do
    it 'returns the containable of the root container' do
      sample = create(:sample)
      dataset = sample.container.analyses_container.children.create!(container_type: 'analysis')
                      .children.create!(container_type: 'dataset')

      expect(dataset.root_element).to eq sample
    end

    it 'returns nil for a root container without containable' do
      expect(create(:container).root_element).to be_nil
    end
  end

  describe '#variation_link_for' do
    let(:analysis) { create(:container, container_type: 'analysis') }
    let(:dataset) { create(:container, container_type: 'dataset', parent: analysis) }

    it 'returns the variation id and analysis id for a suffixed filename' do
      attachment = build(:attachment, filename: 'spectrum-v3.jdx')

      expect(dataset.variation_link_for(attachment)).to eq ['3', analysis.id]
    end

    it 'returns nil when the filename has no variation suffix' do
      attachment = build(:attachment, filename: 'spectrum.jdx')

      expect(dataset.variation_link_for(attachment)).to be_nil
    end

    it 'returns nil for non-dataset containers' do
      attachment = build(:attachment, filename: 'spectrum-v3.jdx')

      expect(analysis.variation_link_for(attachment)).to be_nil
    end
  end

  describe 'plain text content' do
    let(:content) { { 'ops' => [{ 'insert' => 'analysis contents' }] }.to_json }

    it 'enqueues the conversion when the quill content changes' do
      expect do
        create(:container, extended_metadata: { 'content' => content })
      end.to change(Delayed::Job.where(queue: 'plain_text_container_content'), :count).by(1)
    end

    it 'does not enqueue the conversion without content' do
      expect do
        create(:container, extended_metadata: { 'kind' => 'NMR' })
      end.not_to change(Delayed::Job.where(queue: 'plain_text_container_content'), :count)
    end

    it 'stores the converted plain text' do
      container = create(:container, extended_metadata: { 'content' => content })
      container.send(:update_content_to_plain_text_without_delay)

      expect(container.reload.plain_text_content).to include 'analysis contents'
    end
  end

  describe 'soft delete' do
    it 'keeps the record in the table after destroy' do
      container = create(:container)
      container.destroy

      expect(described_class.with_deleted.find_by(id: container.id)).to be_present
      expect(described_class.find_by(id: container.id)).to be_nil
    end
  end
end
