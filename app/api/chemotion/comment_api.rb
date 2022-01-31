module Chemotion
  class CommentAPI < Grape::API
    resource :comments do
      desc 'Return comment by ID'
      params do
        requires :id, type: Integer, desc: 'Comment ID'
      end

      route_param :id do
        get do
          comment = Comment.find(params[:id])

          if comment.commentable.created_by == current_user.id # everyone with access to the shared or synced collection
            present comment, with: Entities::CommentEntity, root: 'comment'
          else
            error!('401 Unauthorized', 401)
          end
        end
      end

      desc 'Return comment by commentable_id and commentable_type'
      params do
        requires :commentable_id, type: Integer, desc: 'Commentable id'
        requires :commentable_type, type: String, values: %w[Sample Reaction]
      end

      get do
        comment = Comment.find_by(
          commentable_id: params[:commentable_id],
          commentable_type: params[:commentable_type],
          created_by: current_user.id
        ) || Comment.new
        present comment, with: Entities::CommentEntity, root: 'comment'
      end

      resource :create do
        desc 'Create a comment'
        params do
          requires :content, type: String
          requires :commentable_id, type: Integer
          requires :commentable_type, type: String, values: %w[Sample Reaction]
          requires :section, type: String, values: Comment.sample_sections.values + Comment.reaction_sections.values
        end

        post do
          attributes = {
            content: params[:content],
            commentable_id: params[:commentable_id],
            commentable_type: params[:commentable_type],
            section: params[:section],
            created_by: current_user.id
          }
          comment = Comment.new(attributes)
          comment.save!

          present comment, with: Entities::CommentEntity, root: 'comment'
        end
      end

      desc 'Update a comment'
      params do
        requires :id, type: Integer, desc: 'Comment id'
        requires :content, type: String
        optional :commentable_id, type: Integer
        optional :commentable_type, type: String, values: %w[Sample Reaction]
      end
      route_param :id do
        after_validation do
          @comment = Comment.find(params[:id])
          error!('404 Comment with given id not found', 404) if @comment.nil?
          error!('401 Unauthorized', 401) unless @comment.created_by == current_user.id
        end

        put do
          attributes = declared(params, include_missing: false)
          @comment.update!(attributes)

          present @comment, with: Entities::CommentEntity, root: 'comment'
        end
      end

      desc 'Delete a comment'
      params do
        requires :id, type: Integer, desc: 'Comment id'
      end
      route_param :id do
        before do
          @comment = Comment.find(params[:id])
          error!('404 Comment with given id not found', 404) if @comment.nil?
          error!('401 Unauthorized', 401) unless @comment.created_by == current_user.id
        end

        delete do
          @comment.destroy
        end
      end
    end
  end
end
