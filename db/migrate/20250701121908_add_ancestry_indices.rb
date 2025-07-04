# frozen_string_literal: true

class AddAncestryIndices < ActiveRecord::Migration[6.1]
  # rubocop:disable Layout/SpaceInsidePercentLiteralDelimiters, Layout/SpaceInsideArrayPercentLiteral
  ANCESTRY_MODELS = [
    # [ :table_name         :column_name :index_name                            ],
    %w[ collections         ancestry      index_collections_on_ancestry         ],
    %w[ attachments         version       index_attachments_on_version          ],
    %w[ samples             ancestry      index_samples_on_ancestry             ],
    %w[ cellline_samples    ancestry      index_cellline_samples_on_ancestry    ],
    %w[ device_descriptions ancestry      index_device_descriptions_on_ancestry ],
    %w[ ols_terms           ancestry      index_ols_terms_on_ancestry           ],
  ].freeze
  # rubocop:enable Layout/SpaceInsidePercentLiteralDelimiters, Layout/SpaceInsideArrayPercentLiteral

  def up
    ANCESTRY_MODELS.each do |table_name, column_name, index_name|
      if column_exists?(table_name, :deleted_at)
        add_index table_name, column_name, opclass: :varchar_pattern_ops, unique: false, name: index_name,
                                         where: 'deleted_at IS NULL'
      else
        add_index table_name, column_name, opclass: :varchar_pattern_ops, unique: false, name: index_name
      end
    end
  end

  def down
    ANCESTRY_MODELS.each do |table_name, _column_name, index_name|
      remove_index table_name, name: index_name if index_exists?(table_name, name: index_name)
    end
  end
end
