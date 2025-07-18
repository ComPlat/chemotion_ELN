# frozen_string_literal: true

class RemoveAncestryIndices < ActiveRecord::Migration[6.1]
  def change
    # rubocop:disable Layout/SpaceInsidePercentLiteralDelimiters, Layout/SpaceInsideArrayPercentLiteral
    tables_with_ancestry = [
      # [ :table_name         :column_name :index_name                            ],
      %w[ collections         ancestry      index_collections_on_ancestry         ],
      %w[ attachments         version       index_attachments_on_version          ],
      %w[ samples             ancestry      index_samples_on_ancestry             ],
      %w[ cellline_samples    ancestry      index_cellline_samples_on_ancestry    ],
      %w[ device_descriptions ancestry      index_device_descriptions_on_ancestry ],
      %w[ ols_terms           ancestry      index_ols_terms_on_ancestry           ],
    ]
    # rubocop:enable Layout/SpaceInsidePercentLiteralDelimiters, Layout/SpaceInsideArrayPercentLiteral

    tables_with_ancestry.each do |table_name, column_name, index_name|
      reversible do |dir|
        dir.up do
          remove_index(table_name, [column_name]) if index_exists?(table_name, [column_name])
          remove_index(table_name, name: index_name) if index_exists?(table_name, name: index_name)
        end
        dir.down do
          add_index(table_name, [column_name], name: index_name) unless index_exists?(table_name, [column_name])
        end
      end
    end
  end
end
