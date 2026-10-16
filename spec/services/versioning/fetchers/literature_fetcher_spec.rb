# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Fetchers::LiteratureFetcher do
  let(:user) { create(:person) }
  let(:reaction) { create(:reaction) }
  let(:literature) { create(:literature, title: 'Some paper') }

  # the API sets a fresh responsible/uuid for every write request, each uuid is one history entry
  def as_request
    Logidze.with_responsible!(user.id)
    yield
  ensure
    Logidze.clear_responsible!
  end

  def create_literal(litype: 'citedOwn')
    as_request do
      Literal.create!(literature: literature, element: reaction, user: user, category: 'detail', litype: litype)
    end
  end

  def versions
    described_class.call(element: reaction.reload)
  end

  def literal_changes
    versions.select { |version| version[:klass_name] == 'Literal' }.pluck(:changes)
  end

  it 'names the entries after the literature' do
    create_literal

    expect(versions.pluck(:name)).to all(eq ['Reference: Some paper'])
  end

  it 'tracks adding a reference' do
    create_literal

    expect(literal_changes.first.dig('litype', :new_value)).to eq 'cited own work'
  end

  it 'tracks changing the citation type' do
    literal = create_literal
    as_request { literal.update!(litype: 'referTo') }

    expect(literal_changes).to include(
      a_hash_including('litype' => a_hash_including(old_value: 'cited own work', new_value: 'referring to')),
    )
  end

  it 'offers the raw citation type for reverting' do
    literal = create_literal
    as_request { literal.update!(litype: 'referTo') }

    expect(literal_changes.last['litype']).to include(revert: %i[litype], revertible_value: 'citedOwn')
  end

  it 'tracks removing a reference' do
    literal = create_literal
    as_request { literal.destroy! }

    expect(literal_changes).to include(
      a_hash_including('deleted_at' => a_hash_including(old_value: false, new_value: true)),
    )
  end

  it 'merges literal and literature changes of the same request into one entry' do
    as_request do
      new_literature = create(:literature, title: 'New paper', url: 'new.example')
      Literal.create!(literature: new_literature, element: reaction, user: user, category: 'detail', litype: 'citedOwn')
    end

    expect(versions.map { |version| version[:changes].keys }).to contain_exactly(
      a_collection_containing_exactly('litype', 'title', 'url', 'doi'),
    )
  end

  it 'lists the literature changes only once when it is cited twice' do
    as_request { literature }
    create_literal(litype: 'citedOwn')
    create_literal(litype: 'referTo')

    expect(versions.count { |version| version[:changes].key?('title') }).to eq 1
  end
end
