# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength

module Usecases
  module Search
    class ConditionsForAdvancedSearch
      attr_reader :params, :detail_levels

      def initialize(detail_levels: {}, params: {})
        @params = params
        @detail_levels = detail_levels

        @table = ''
        @field_table = ''
        @match = ''
        @conditions = {
          joins: [], field: '', condition_table: '', first_condition: '',
          additional_condition: '', words: '', model_name: '', value: [],
          query: '', error: ''
        }
        @table_or_tab_types = {
          generics: false, chemicals: false, analyses: false, measurements: false, literatures: false
        }
      end

      def filter!
        @params.each_with_index do |filter, i|
          @conditions[:error] = "Your search for #{filter['field']['column']} is not allowed"
          next unless table_or_detail_level_is_not_allowed(filter)

          @conditions[:error] = ''
          basic_conditions_by_filter(filter)
          table_or_tab_types
          special_and_generic_conditions_by_filter(filter, i)
          conditions_for_query = conditions

          if conditions_for_query.present?
            @conditions[:query] = "#{@conditions[:query]} #{filter['link']} (#{conditions_for_query}) "
          end
          @conditions[:value] += @conditions[:words] if @conditions[:field].present?
        end
        @conditions
      end

      private

      def basic_conditions_by_filter(filter)
        @table = filter['table']
        @field_table = filter['field']['table']
        @conditions[:model_name] = model_name(@table)
        @match = filter['value'] == 'true' ? '=' : filter['match']
        @conditions[:condition_table] = "#{@table}."
        @conditions[:first_condition] = ''
        @conditions[:additional_condition] = ''
        @conditions[:field] = filter['field']['column']
        @conditions[:words] = sanitize_words(filter)

        return unless @table == 'elements' && filter['element_id'] != 0

        @conditions[:additional_condition] = "AND element_klass_id = #{filter['element_id']}"
      end

      def model_name(table)
        table == 'elements' ? Labimotion::Element : table.singularize.camelize.constantize
      end

      def special_and_generic_conditions_by_filter(filter, number)
        if @table_or_tab_types[:generics]
          generic_field_options(filter, number)
        elsif @table_or_tab_types[:chemicals]
          chemicals_tab_options(filter)
        elsif @table_or_tab_types[:analyses]
          analyses_tab_options(filter, number)
        elsif @table_or_tab_types[:measurements]
          measurements_tab_options(filter)
        elsif @table_or_tab_types[:literatures]
          literatures_tab_options(filter)
        else
          special_non_generic_field_options(filter)
        end
      end

      # rubocop:disable Metrics/CyclomaticComplexity
      def table_or_tab_types
        @table_or_tab_types[:generics] = (@field_table.present? && @field_table == 'segments') ||
                                         (@table == 'elements' && %w[name short_label].exclude?(@conditions[:field]))
        @table_or_tab_types[:chemicals] = @field_table.present? && @field_table == 'chemicals'
        @table_or_tab_types[:analyses] = @field_table.present? && %w[containers datasets].include?(@field_table)
        @table_or_tab_types[:measurements] = @field_table.present? && @field_table == 'measurements'
        @table_or_tab_types[:literatures] = @table.present? && @table == 'literatures'
      end
      # rubocop:enable Metrics/CyclomaticComplexity

      def conditions
        condition =
          if @conditions[:field].blank?
            "#{@conditions[:first_condition]}#{@conditions[:additional_condition]}"
          else
            "#{@conditions[:first_condition]}#{@conditions[:condition_table]}#{@conditions[:field]} #{@match} ?
            #{@conditions[:additional_condition]}"
          end

        @conditions[:words] = [@conditions[:words].join("\n")] if @conditions[:words].size > 1 && @match == '='

        @conditions[:words].collect { condition }.join(' OR ') if condition.present?
      end

      def table_or_detail_level_is_not_allowed(filter)
        filter['field']['table'] = filter['field']['table'] || filter['table']
        filter['field']['column'] = filter['field']['column'] || filter['field']['field']
        adv_field = filter['field'].to_h.merge(@detail_levels).symbolize_keys
        whitelisted_table(**adv_field) && filter_with_detail_level(**adv_field)
      end

      def whitelisted_table(table:, column:, **_)
        tables = %w[elements segments chemicals containers measurements molecules literals literatures datasets]
        return true if tables.include?(table)

        API::WL_TABLES.key?(table) && API::WL_TABLES[table].include?(column)
      end

      # desc: return true if the detail level allow to access the column
      def filter_with_detail_level(table:, column:, sample_detail_level:, reaction_detail_level:, **_)
        # TODO: filter according to columns

        return true unless table.in?(%w[samples reactions])
        return true if table == 'samples' && (sample_detail_level.positive? || column == 'external_label')
        return true if table == 'reactions' && reaction_detail_level > -1

        false
      end

      def duration_interval_by_unit(unit)
        case unit
        when 'Minute(s)' then 60
        when 'Second(s)' then 1
        when 'Week(s)' then 604_800
        when 'Day(s)' then 86_400
        else
          3600
        end
      end

      def sanitize_float_fields(filter)
        fields = %w[
          boiling_point melting_point density molarity_value target_amount_value purity
          temperature duration molecular_mass
        ]
        fields.include?(filter['field']['column']) && filter['field']['table'] != 'segments'
      end

      def sanitize_words(filter)
        return [filter['value']] if filter['value'] == 'true'
        return [filter['smiles']] if filter['field']['column'] == 'solvent'
        return [filter['value'].to_f] if sanitize_float_fields(filter)

        no_sanitizing_matches = ['=', '>=']
        sanitize = no_sanitizing_matches.exclude?(filter['match'])
        words = filter['value'].split(/(\r)?\n/).map!(&:strip)
        words = words.map { |e| "%#{ActiveRecord::Base.send(:sanitize_sql_like, e)}%" } if sanitize
        words
      end

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity

      def special_non_generic_field_options(filter)
        case filter['field']['column']
        when 'body'
          prop = "element_#{filter['field']['opt']}"
          key = filter['field']['opt']
          element_join = "CROSS JOIN jsonb_array_elements(body) AS #{prop}"
          if @conditions[:joins].exclude?(element_join)
            @conditions[:joins] << element_join
            @conditions[:joins] << "CROSS JOIN jsonb_array_elements(#{prop} -> 'value' -> '#{key}') AS #{key}"
          end
          if filter['field']['opt'] == 'rows'
            @conditions[:field] = 'rows::TEXT'
            @conditions[:additional_condition] = "AND (#{prop} ->> 'type')::TEXT = 'table'"
          else
            @conditions[:field] = "(regexp_replace(#{key} ->> 'insert', '\r|\n', '', 'g'))::TEXT"
          end
          @conditions[:condition_table] = ''
        when 'content'
          @conditions[:joins] <<
            "INNER JOIN private_notes ON private_notes.noteable_type = '#{@conditions[:model_name]}'
            AND private_notes.noteable_id = #{@table}.id"
          @conditions[:condition_table] = 'private_notes.'
        when 'temperature'
          regex_number = "'^-{0,1}\\d+(\\.\\d+){0,1}\\Z'"
          is_data_valid = "(#{@table}.temperature ->> 'userText' ~ #{regex_number})"

          @conditions[:field] =
            "CASE WHEN #{is_data_valid} THEN (#{@table}.temperature ->> 'userText')::FLOAT ELSE -30000 END "

          @conditions[:first_condition] += " (#{@table}.temperature ->> 'valueUnit')::TEXT != '' AND "
          @conditions[:additional_condition] = "AND (#{@table}.temperature ->> 'valueUnit')::TEXT = '#{filter['unit']}'"
          @conditions[:condition_table] = ''
        when 'duration'
          time_divisor = duration_interval_by_unit(filter['unit'])
          is_data_valid = "#{@table}.duration similar to ('\\d+%')"
          time_from_duration_column = "EXTRACT(epoch FROM #{@table}.duration::interval)/#{time_divisor}::INT"

          @conditions[:field] =
            "CASE WHEN #{is_data_valid} THEN #{time_from_duration_column} ELSE 0 END"

          @conditions[:condition_table] = ''
        when 'target_amount_value'
          @conditions[:additional_condition] = "AND #{@table}.target_amount_unit = '#{filter['unit']}'"
        when 'readout_titles'
          @conditions[:joins] << 'CROSS JOIN jsonb_array_elements(readout_titles) AS titles'
          @conditions[:field] = "REPLACE(titles::TEXT, '\"', '')"
          @conditions[:condition_table] = ''
        when 'purification', 'dangerous_products'
          @conditions[:field] = "(#{@table}.#{filter['field']['column']})::TEXT"
          @conditions[:condition_table] = ''
        when 'iupac_name'
          @conditions[:field] = "#{filter['field']['table']}.#{filter['field']['column']}"
          @conditions[:additional_condition] =
            "OR #{filter['field']['table']}.sum_formular ILIKE '#{@conditions[:words][0]}'"
          @conditions[:condition_table] = ''
        when 'xref'
          @conditions[:field] = "xref ->> '#{filter['field']['opt']}'"
          if filter['unit'].present?
            @conditions[:field] = "xref -> '#{filter['field']['opt']}' ->> 'value'"
            @conditions[:additional_condition] =
              "AND (#{@table}.xref -> '#{filter['field']['opt']}' ->> 'unit')::TEXT = '#{filter['unit']}'"
          end
        when 'stereo'
          @conditions[:field] = "stereo ->> '#{filter['field']['opt']}'"
        when 'solvent'
          cross_join_empty = @conditions[:joins].exclude?('CROSS JOIN jsonb_array_elements(solvent) AS prop_solvent')
          @conditions[:joins] << 'CROSS JOIN jsonb_array_elements(solvent) AS prop_solvent' if cross_join_empty
          @conditions[:field] = "(prop_solvent ->> '#{filter['field']['opt']}')::TEXT"
          @conditions[:condition_table] = ''
        when 'boiling_point', 'melting_point'
          range = filter['value'].split.split('-').flatten
          field = "#{@table}.#{filter['field']['column']}"
          @match = '!='
          @conditions[:words][0] = '(,)'
          @conditions[:additional_condition] =
            "AND #{field} <@ '[#{range.first.squish.to_f}, #{range.last.squish.to_f}]'::numrange"
        when 'plain_text_description', 'plain_text_observation'
          @conditions[:field] = "(regexp_replace(#{@table}.#{filter['field']['column']}, '\r|\n', '', 'g'))::TEXT"
          @conditions[:condition_table] = ''
        end
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/MethodLength, Metrics/PerceivedComplexity

      # rubocop:disable Metrics/AbcSize

      def generic_field_options(filter, number)
        key = filter['field']['key']
        prop = "prop_#{key}_#{number}"
        segments_alias = "segments_#{filter['field']['element_id']}"
        element_table = @table == 'elements' ? 'elements' : segments_alias
        segments_join =
          "INNER JOIN segments AS #{segments_alias} ON #{segments_alias}.element_type = '#{@conditions[:model_name]}'"
        segments_join += " AND #{segments_alias}.element_id = #{@table}.id
                          AND #{segments_alias}.segment_klass_id = #{filter['field']['element_id']}"
        segments_join_condition = element_table == segments_alias && @conditions[:joins].exclude?(segments_join)

        @conditions[:joins] << segments_join if segments_join_condition
        @conditions[:joins] <<
          "CROSS JOIN jsonb_array_elements(#{element_table}.properties -> 'layers' -> '#{key}' -> 'fields') AS #{prop}"

        if filter['sub_values'].present?
          generic_sub_field_options(filter['sub_values'], prop, filter)
        else
          @conditions[:field] = "(#{prop} ->> 'value')::TEXT"
          @conditions[:additional_condition] = "AND (#{prop} ->> 'field')::TEXT = '#{filter['field']['column']}'"
        end

        @conditions[:condition_table] = ''
      end

      def generic_sub_field_options(sub_values, prop, filter)
        @conditions[:field] = ''
        @conditions[:additional_condition] = "(#{prop} ->> 'field')::TEXT = '#{filter['field']['column']}'"

        sub_values.first.each_with_index do |(key, value), j|
          next if value == ''

          prop_sub = "#{prop}_sub_#{j}"
          sub_value = "%#{value}%"
          unit = ''
          sub_match = 'ILIKE'
          sub_fields = filter['field']['type'] == 'table' ? 'sub_values' : 'sub_fields'
          if value['value'].present?
            sub_value = value['value'].tr(',', '.')
            search_field = "replace((#{prop_sub} -> '#{key}' ->> 'value_system')::TEXT, '°', '')"
            unit = " AND #{search_field} = '#{value['value_system'].delete('°')}'"
            sub_match = '>='
          end

          @conditions[:joins] << "CROSS JOIN jsonb_array_elements(#{prop} -> '#{sub_fields}') AS #{prop_sub}"

          if filter['field']['type'] == 'table'
            @conditions[:additional_condition] +=
              " AND (#{prop_sub} ->> '#{key}')::TEXT #{sub_match} '#{sub_value}'#{unit}"
          else
            @conditions[:additional_condition] += " AND (#{prop_sub} ->> 'id')::TEXT = '#{key}'
                                                AND (#{prop_sub} ->> 'value')::TEXT ILIKE '%#{value}%'"
          end
        end
      end

      def chemicals_tab_options(filter)
        prop = "prop_#{@field_table}"
        @conditions[:condition_table] = ''

        if @conditions[:joins].exclude?('INNER JOIN chemicals ON chemicals.sample_id = samples.id')
          @conditions[:joins] << "INNER JOIN #{@field_table} ON #{@field_table}.sample_id = #{@table}.id"
          @conditions[:joins] << "CROSS JOIN jsonb_array_elements(#{@field_table}.chemical_data) AS #{prop}"
        end

        if filter['sub_values'].present?
          filter['sub_values'].first.each_with_index do |(key, value), j|
            first_and = j.zero? ? '' : ' AND'
            @conditions[:field] = ''
            @conditions[:additional_condition] += "#{first_and} (#{prop} ->> '#{key}')::TEXT ILIKE '#{value}'"
          end
        elsif filter['unit'].present?
          @conditions[:field] = "(#{prop} -> '#{filter['field']['column']}' ->> 'value')::FLOAT"
          @conditions[:words][0] = filter['value'].to_f
          unit = %w[mg g].include?(filter['unit']) ? filter['unit'] : 'μg'
          @conditions[:additional_condition] = "AND #{prop} -> '#{filter['field']['column']}' ->> 'unit' = '#{unit}'"
        else
          @conditions[:field] = "(#{prop} ->> '#{filter['field']['column']}')::TEXT"
        end
      end
      # rubocop:enable Metrics/AbcSize

      def analyses_tab_options(filter, number)
        prop = 'prop_containers'
        @conditions[:condition_table] = ''
        analyses_joins(prop)

        if @field_table == 'datasets'
          dataset_tab_options(filter, number)
        else
          @conditions[:field] =
            if %w[name description plain_text_content].include?(filter['field']['column'])
              "children.#{filter['field']['column']}"
            else
              "children.extended_metadata -> '#{filter['field']['column']}'"
            end

          @conditions[:additional_condition] +=
            if %w[name description plain_text_content].include?(filter['field']['column'])
              "OR dataset.#{filter['field']['column']} ILIKE '%#{filter['value']}%'"
            else
              "OR dataset.extended_metadata -> '#{filter['field']['column']}' ILIKE '%#{filter['value']}%'"
            end
        end
      end

      def analyses_joins(prop)
        field_table_inner_join =
          "INNER JOIN containers AS #{prop} ON #{prop}.containable_type = '#{@conditions[:model_name]}'
          AND #{prop}.containable_id = #{@table}.id"
        return if @conditions[:joins].include?(field_table_inner_join)

        @conditions[:joins] << field_table_inner_join
        @conditions[:joins] << "INNER JOIN containers AS analysis ON analysis.parent_id = #{prop}.id"
        @conditions[:joins] << 'INNER JOIN containers AS children ON children.parent_id = analysis.id'
        @conditions[:joins] << 'LEFT JOIN containers AS dataset ON dataset.parent_id = children.id'
      end

      def dataset_tab_options(filter, number)
        key = filter['field']['key']
        prop = "prop_#{key}_#{number}"
        datasets_joins(filter, prop, key)

        if filter['field']['column'] == 'datasets_type'
          @conditions[:field] = ''
        else
          field = filter['field']['column'].remove('datasets_')
          @conditions[:field] = "(#{prop} ->> 'value')::TEXT"
          @conditions[:additional_condition] = "AND (#{prop} ->> 'field')::TEXT = '#{field}'"
          if filter['unit'].present?
            unit = filter['unit'].remove('°').remove(/ \(.*\)/).tr('/', '_')
            @conditions[:additional_condition] +=
              " AND LOWER((#{prop} ->> 'value_system')::TEXT) = LOWER('#{unit}')"
          end
        end
      end

      def datasets_joins(filter, prop, key)
        datasets_join =
          "INNER JOIN datasets ON datasets.element_id = dataset.id AND datasets.element_type = 'Container'"

        @conditions[:joins] << datasets_join if @conditions[:joins].exclude?(datasets_join)

        if filter['field']['column'] == 'datasets_type'
          @conditions[:joins] <<
            "INNER JOIN dataset_klasses ON dataset_klasses.id = datasets.dataset_klass_id
            AND dataset_klasses.ols_term_id = '#{filter['value']}'"
        else
          @conditions[:joins] <<
            "CROSS JOIN jsonb_array_elements(datasets.properties -> 'layers' -> '#{key}' -> 'fields') AS #{prop}"
        end
      end

      def measurements_tab_options(filter)
        @conditions[:condition_table] = ''
        @conditions[:field] = "#{@field_table}.#{filter['field']['column']}"
        field_table_inner_join = "INNER JOIN #{@field_table} ON #{@field_table}.sample_id = #{@table}.id"
        @conditions[:joins] << field_table_inner_join if @conditions[:joins].exclude?(field_table_inner_join)
      end

      def literatures_tab_options(filter)
        @conditions[:condition_table] = ''
        @conditions[:field] = "#{@field_table}.#{filter['field']['column']}"
        field_table_inner_join = 'INNER JOIN literals ON literals.literature_id = literatures.id'
        @conditions[:joins] << field_table_inner_join if @conditions[:joins].exclude?(field_table_inner_join)
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength
