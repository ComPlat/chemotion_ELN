module Reporter
  module Docx
    class Detail
      attr_reader :obj, :digit, :last_id
      def initialize(args)
        @spl_settings = args[:spl_settings] || {}
        @rxn_settings = args[:rxn_settings] || {}
        @si_rxn_settings = args[:si_rxn_settings] || {}
        @configs = args[:configs] || { whole_diagram: true }
        @last_id = args[:last_id]
        @digit = args.fetch(:digit, 3)
        @img_format = args[:img_format]
      end

      MET_PREF_SYMBOLS = {
        u: 'μ', # micro
        m: 'm', # milli
        c: 'c', # centi
        d: 'd', # deci
        n: '', # none
        k: 'k', # kilo
      }.with_indifferent_access.freeze
      MET_PREF = {
        u: 0.000001,
        m: 0.001,
        c: 0.01,
        d: 0.1,
        n: 1.0,
        k: 1000.0,
      }.with_indifferent_access.freeze

      private

      def id
        obj.id
      end

      def collection_label
        obj.collections.map { |c| c[:label] if c[:label] != "All" }.compact.join(", ")
      end

      def merge_items(init, items)
        items.reduce(init) do |sum, i|
          ops = parse_ops(i)
          sum + ops
        end
      end

      def merge_items_symbols(init, items, symbol)
        items.reduce(init) do |sum, i|
          ops = parse_ops(i)
          ops = rm_head_tail_space(ops)
          return sum if ops.blank?

          sum + ops_tail_with_symbol(ops, symbol)
        end
      end

      def ops_tail_with_symbol(ops, symbol)
        ops + [{ 'insert' => symbol }]
      end

      def rm_head_tail_space(ops = [])
        ops = rm_head_space(ops)
        rm_tail_space(ops)
      end

      def rm_head_space(ops = [])
        head = nil
        ops.each do |op|
          head = op["insert"] && op["insert"]['image'].blank? ? op['insert'].gsub(/^[\u00A0\s]+/, '') : op['insert']
          break if head.present?

          ops = ops[1..-1]
        end
        return [] if ops.blank?

        ops[0]['insert'] = head
        ops
      end

      def rm_tail_space(ops = [])
        tail = nil
        ops.reverse.each do |op|
          tail = op["insert"] && op["insert"]['image'].blank? ? op['insert'].gsub(/[\u00A0\s]*[,.;]*[\u00A0\s]*$/, '') : op['insert']
          break if tail.present?

          ops = ops[0..-2]
        end
        return [] if ops.blank?

        ops[-1]['insert'] = tail
        ops
      end

      def parse_ops(i)
        if i['extended_metadata'] && i['extended_metadata']['content']
          JSON.parse(i['extended_metadata']['content'])['ops']
        elsif i[:extended_metadata] && i[:extended_metadata][:content]
          i[:extended_metadata][:content]['ops']
        else
          []
        end
      end

      def rm_redundant_newline(ops)
        return unless ops

        ops.map do |op|
          op['insert'] = op['insert'].chomp if op['insert'] && op['insert']['image'].blank?
        end
        ops.reject { |hash| hash.values.any?(&:blank?) }
      end

      def remove_redundant_space_break(ops) # ensure one line
        return [{ 'insert' => '' }] unless ops

        ops.map.with_index do |op, i|
          if op["insert"] && op["insert"]['image'].blank?
            op["insert"] = op["insert"].gsub(/[\u00A0\s]{2,}/, " ")
            op["insert"] = op["insert"].lstrip if i == 0
            op["insert"] = op["insert"].gsub(/\n/, " ")
          end
          op
        end
      end

      def fixed_digit(input_num, digit_num)
        Chemotion::Calculations.fixed_digit(input_num, digit_num)
      end

      def valid_digit(input_num, digit_num)
        Chemotion::Calculations.valid_digit(input_num, digit_num)
      end

      def alphabet(counter)
        alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        counter = counter >= 1 && counter <=26 ? counter - 1 : 25
        alphabets[counter]
      end

      def met_pre_conv(value, from_mp, to_mp)
        (MET_PREF[from_mp] / MET_PREF[to_mp]) * value.to_f
      end

      def met_pref(metric_prefix, unit)
        "#{MET_PREF_SYMBOLS[metric_prefix]}#{unit}"
      end

      def normalize_liter_unit(unit)
        unit.to_s.tr('L', 'l')
      end
    end
  end
end
