# frozen_string_literal: true

require 'rails_helper'

# The helpers are the Grape entry points to Usecases::Attachments::Access, whose rules are
# covered in spec/usecases/attachments/access_spec.rb.
RSpec.describe AttachmentHelpers do
  let(:helpers) { Class.new { include AttachmentHelpers }.new }
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:attachment) { create(:attachment, attachable: create(:container, containable: user)) }

  it 'grants read and write through the shared rule' do
    expect([helpers.read_access?(attachment, user), helpers.write_access?(attachment, user)]).to all(be true)
  end

  it 'denies read and write through the shared rule' do
    expect([helpers.read_access?(attachment, other_user), helpers.write_access?(attachment, other_user)])
      .to all(be false)
  end
end
