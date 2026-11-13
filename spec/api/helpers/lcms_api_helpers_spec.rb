# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LcmsApiHelpers do
  let(:helpers) { Class.new { include LcmsApiHelpers }.new }
  let(:user) { create(:person) }

  describe '#lcms_sibling_attachments' do
    it 'finds the other attachments of the same container' do
      container = create(:container)
      att = create(:attachment, attachable: container)
      sibling = create(:attachment, attachable: container)
      create(:attachment, attachable: create(:container))

      expect(helpers.send(:lcms_sibling_attachments, att)).to contain_exactly(sibling)
    end

    it 'finds nothing for an unattached file' do
      att = create(:attachment, attachable: nil, attachable_type: 'Container', created_for: user.id)
      create(:attachment, attachable: nil, attachable_type: 'Container', created_for: create(:person).id)
      create(:attachment, attachable: nil, attachable_type: nil, created_for: create(:person).id)

      expect(helpers.send(:lcms_sibling_attachments, att)).to be_empty
    end
  end
end
