module Reporter
  module Docx
    class Detail
      attr_reader :obj, :digit, :last_id
      def initialize(args)
        @spl_settings = args[:spl_settings]
        @rxn_settings = args[:rxn_settings]
        @configs = args[:configs] || { whole_diagram: true }
        @last_id = args[:last_id]
        @digit = args.fetch(:digit, 3)
        @img_format = args[:img_format]
      end

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
          head = op['insert'].gsub(/^[\u00A0\s]+/, '')
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
          tail = op['insert'].gsub(/[\u00A0\s]*[,.;]*[\u00A0\s]*$/, '')
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
          JSON.parse(i[:extended_metadata][:content])['ops']
        else
          []
        end
      end

      def remove_redundant_space_break(ops) # ensure one line
        ops.map.with_index do |op, i|
          if op["insert"]
            op["insert"] = op["insert"].gsub(/[\u00A0\s]{2,}/, " ")
            op["insert"] = op["insert"].lstrip if i == 0
            op["insert"] = op["insert"].gsub(/\n/, " ")
          end
          op
        end
      end
    end
  end
end
