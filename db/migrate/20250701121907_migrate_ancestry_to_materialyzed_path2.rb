# frozen_string_literal: true

class MigrateAncestryToMaterialyzedPath2 < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  #
  # models with has_ancestry
  # ANCESTRY_MODELS = [
  #  # [ :table_name         :column_name :index_name                            ],
  #  %w[ collections         ancestry      index_collections_on_ancestry         ],
  #  %w[ attachments         version       index_attachments_on_version          ],
  #  %w[ samples             ancestry      index_samples_on_ancestry             ],
  #  %w[ cellline_samples    ancestry      index_cellline_samples_on_ancestry    ],
  #  %w[ device_descriptions ancestry      index_device_descriptions_on_ancestry ],
  #  %w[ ols_terms           ancestry      index_ols_terms_on_ancestry           ],
  # ].freeze
  ANCESTRY_MODELS = [
    Collection, Attachment, Sample, CelllineSample, DeviceDescription, OlsTerm
  ].freeze
  def change
    reversible do |dir|
      ANCESTRY_MODELS.each do |model|
        table_name = model.table_name
        column_name = model.ancestry_column
        dir.up do
          execute <<~SQL.squish
            UPDATE #{table_name}
            SET #{column_name} = '/' || trim(both '/' FROM #{column_name}) || '/'
            WHERE #{column_name} IS NOT NULL;
          SQL

          execute <<~SQL.squish
            UPDATE #{table_name}
            SET #{column_name} = '/'
            WHERE #{column_name} IS NULL;
          SQL

          change_table table_name do |t|
            t.change column_name, :string, default: '/', null: false, collation: 'C'
          end
        end

        dir.down do
          change_table table_name do |t|
            t.change column_name, :string, default: nil, null: true, collation: nil
          end
          execute <<~SQL.squish
            UPDATE #{table_name}
            SET #{column_name} = NULL
            WHERE #{column_name} = '/';
          SQL

          execute <<~SQL.squish
            UPDATE #{table_name}
            SET #{column_name} = trim(both '/' FROM #{column_name})
            WHERE #{column_name} IS NOT NULL;
          SQL
        end
      end
    end
  end
end
