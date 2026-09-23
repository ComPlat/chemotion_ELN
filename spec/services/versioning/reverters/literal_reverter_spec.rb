# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Reverters::LiteralReverter do
  let(:literature) { create(:literature, title: 'Some paper') }
  let(:literal) { create(:literal, literature: literature, litype: 'referTo') }

  def revert(fields)
    described_class.call('db_id' => literal.id, 'fields' => fields)
    Literal.with_deleted.find(literal.id)
  end

  it 'reverts the citation type' do
    expect(revert([{ 'name' => 'litype', 'value' => 'citedOwn' }]).litype).to eq 'citedOwn'
  end

  it 'restores a deleted literal' do
    literal.destroy!

    expect(revert([{ 'name' => 'deleted_at', 'value' => nil }])).not_to be_deleted
  end

  it 'ignores fields that cannot be edited' do
    expect { revert([{ 'name' => 'literature_id', 'value' => create(:literature).id }]) }
      .not_to(change { literal.reload.literature_id })
  end
end
