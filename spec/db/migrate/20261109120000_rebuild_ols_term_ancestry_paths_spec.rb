# frozen_string_literal: true

require 'rails_helper'

load Rails.root.join('db/migrate/20261109120000_rebuild_ols_term_ancestry_paths.rb').to_s

RSpec.describe 'migration 20261109120000: RebuildOlsTermAncestryPaths' do # rubocop:disable RSpec/DescribeClass
  let!(:root) { OlsTerm.create!(owl_name: 'rxno', term_id: 'RXNO:1') }
  let!(:middle) { OlsTerm.create!(owl_name: 'rxno', term_id: 'RXNO:2', parent: root) }
  let!(:leaf) { OlsTerm.create!(owl_name: 'rxno', term_id: 'RXNO:3', parent: middle) }

  def set_ancestry(term, value)
    term.update_column(:ancestry, value) # rubocop:disable Rails/SkipsModelValidations
  end

  it 'rebuilds a path that stores only the direct parent' do
    set_ancestry(leaf, "/#{middle.id}/")

    RebuildOlsTermAncestryPaths.new.up

    expect(leaf.reload.ancestry).to eq "/#{root.id}/#{middle.id}/"
    expect(root.reload.descendants).to contain_exactly(middle, leaf)
  end

  it 'collapses doubled slashes' do
    set_ancestry(leaf, "/#{root.id}//#{middle.id}/")

    RebuildOlsTermAncestryPaths.new.up

    expect(leaf.reload.ancestry).to eq "/#{root.id}/#{middle.id}/"
  end

  it 'makes a term whose parent is missing or in another ontology a root' do
    other = OlsTerm.create!(owl_name: 'chmo', term_id: 'CHMO:1')
    set_ancestry(middle, "/#{other.id}/")

    RebuildOlsTermAncestryPaths.new.up

    expect(middle.reload.ancestry).to eq '/'
    expect(leaf.reload.ancestry).to eq "/#{middle.id}/"
  end

  it 'leaves full paths untouched' do
    expect { RebuildOlsTermAncestryPaths.new.up }.not_to(change { OlsTerm.order(:id).pluck(:ancestry, :updated_at) })
  end
end
