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

  describe '#update_body_attachments' do
    # Body mixes the legacy image-field shape (rewritten by public_name) and
    # richtext delta ops containing attachment-image / attachment-file blots
    # (rewritten by the new remap). Both must be flipped from ORIG-* to
    # COPY-* so a duplicated RP no longer references the source's attachments.
    let(:body) do
      [
        {
          'id' => SecureRandom.uuid,
          'type' => 'image',
          'value' => { 'public_name' => 'ORIG-IMG', 'file_name' => 'x.png' },
        },
        {
          'id' => SecureRandom.uuid,
          'type' => 'richtext',
          'value' => { 'ops' => [
            { 'insert' => 'before ' },
            { 'insert' => { 'attachment-image' => { 'attachment_identifier' => 'ORIG-RT-IMG', 'filename' => 'x.png' } } },
            { 'insert' => { 'attachment-file'  => { 'attachment_identifier' => 'ORIG-RT-FILE', 'filename' => 'x.pdf' } } },
            { 'insert' => " after\n" },
            # An unrelated identifier that must NOT be rewritten.
            { 'insert' => { 'attachment-image' => { 'attachment_identifier' => 'UNRELATED', 'filename' => 'y.png' } } },
          ] },
        },
      ]
    end

    let(:research_plan) { create(:research_plan, body: body) }

    it 'rewrites the legacy image-field public_name' do
      research_plan.update_body_attachments('ORIG-IMG', 'COPY-IMG')
      expect(research_plan.reload.body[0]['value']['public_name']).to eq('COPY-IMG')
    end

    it 'rewrites attachment-image identifiers inside richtext ops' do
      research_plan.update_body_attachments('ORIG-RT-IMG', 'COPY-RT-IMG')
      ops = research_plan.reload.body[1]['value']['ops']
      img_ids = ops.filter_map { |op| op['insert'].is_a?(Hash) ? op['insert'].dig('attachment-image', 'attachment_identifier') : nil }
      expect(img_ids).to contain_exactly('COPY-RT-IMG', 'UNRELATED')
    end

    it 'rewrites attachment-file identifiers inside richtext ops' do
      research_plan.update_body_attachments('ORIG-RT-FILE', 'COPY-RT-FILE')
      ops = research_plan.reload.body[1]['value']['ops']
      file_id = ops.filter_map { |op| op['insert'].is_a?(Hash) ? op['insert'].dig('attachment-file', 'attachment_identifier') : nil }.first
      expect(file_id).to eq('COPY-RT-FILE')
    end

    it 'leaves unrelated identifiers untouched' do
      research_plan.update_body_attachments('ORIG-RT-IMG', 'COPY-RT-IMG')
      ops = research_plan.reload.body[1]['value']['ops']
      unrelated_still_there = ops.any? { |op| op['insert'].is_a?(Hash) && op['insert'].dig('attachment-image', 'attachment_identifier') == 'UNRELATED' }
      expect(unrelated_still_there).to be(true)
    end
  end
end
