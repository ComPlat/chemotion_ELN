# frozen_string_literal: true

module Chemotion
  class CommentAPI < Grape::API
    helpers CommentHelpers

    rescue_from ActiveRecord::RecordNotFound do
      error!('Comment not found', 400)
    end

    helpers do
      def authorize_commentable_access(commentable)
        collections = Collection.where(id: commentable.collections.ids)
        allowed_user_ids = authorized_users(collections)

        error!('401 Unauthorized', 401) unless allowed_user_ids.include?(current_user.id)
      end

      def authorize_update_access(comment)
        error!('401 Unauthorized', 401) unless comment.created_by == current_user.id || params[:status].eql?('Resolved')
      end

      def authorize_delete_access(comment)
        error!('401 Unauthorized', 401) unless comment.created_by == current_user.id
      end

      def validate_comment_status(comment)
        error!('422 Unprocessable Entity', 422) if comment.resolved?
      end

      def find_commentable(commentable_type, commentable_id)
        commentable_type.classify.constantize.find(commentable_id)
      end
    end

    resource :comments do
      route_param :id do
        desc 'Get a comment'
        params do
          requires :id, type: Integer, desc: 'Comment ID'
        end

        get do
          comment = Comment.find(params[:id])
          authorize_commentable_access(comment.commentable)

          present comment, with: Entities::CommentEntity, root: 'comment'
        end

        desc 'Update a comment'
        params do
          requires :id, type: Integer, desc: 'Comment id'
          requires :content, type: String
          optional :status, type: String, values: %w[Pending Resolved]
          optional :commentable_id, type: Integer
          optional :commentable_type, type: String, values: Comment::COMMENTABLE_TYPE
        end

        put do
          comment = Comment.find(params[:id])

          authorize_update_access(comment)
          validate_comment_status(comment)

          attributes = declared(params, include_missing: false)
          if params[:status].eql?('Resolved')
            attributes[:resolver_name] = "#{current_user.first_name} #{current_user.last_name}"
          end
          comment.update!(attributes)

          if comment.saved_change_to_status? && comment.created_by != current_user.id
            notify_comment_resolved(comment, current_user)
          end

          present comment, with: Entities::CommentEntity, root: 'comment'
        end

        desc 'Delete a comment'
        params do
          requires :id, type: Integer, desc: 'Comment id'
        end

        delete do
          comment = Comment.find(params[:id])
          authorize_delete_access(comment)

          comment.destroy
        end
      end

      desc 'Create a comment'
      params do
        requires :content, type: String
        requires :commentable_id, type: Integer
        requires :commentable_type, type: String, values: Comment::COMMENTABLE_TYPE
        requires :section,
                 type: String,
                 values: Comment.sample_sections.values +
                         Comment.reaction_sections.values +
                         Comment.wellplate_sections.values +
                         Comment.screen_sections.values +
                         Comment.research_plan_sections.values +
                         Comment.device_description_sections.values +
                         Comment.sequence_based_macromolecule_sample_sections.values +
                         Comment.header_sections.values
      end

      post do
        commentable = find_commentable(params[:commentable_type], params[:commentable_id])
        collections = Collection.where(id: commentable.collections.ids)

        allowed_user_ids = authorized_users(collections)

        error!('401 Unauthorized', 401) unless allowed_user_ids.include? current_user.id

        attributes = {
          content: params[:content],
          commentable_id: params[:commentable_id],
          commentable_type: params[:commentable_type],
          section: params[:section],
          created_by: current_user.id,
          submitter: "#{current_user.first_name} #{current_user.last_name}",
        }
        comment = Comment.new(attributes)
        comment.save!

        create_message_notification(collections, current_user, commentable)

        present comment, with: Entities::CommentEntity, root: 'comment'
      end

      desc 'Return comment by commentable_id and commentable_type'
      params do
        requires :commentable_id, type: Integer, desc: 'Commentable id'
        requires :commentable_type, type: String, values: Comment::COMMENTABLE_TYPE
      end

      get do
        commentable = find_commentable(params[:commentable_type], params[:commentable_id])

        authorize_commentable_access(commentable)

        comments = Comment.where(
          commentable_id: params[:commentable_id],
          commentable_type: params[:commentable_type],
        ).order(:status, :section, created_at: :desc)

        present comments, with: Entities::CommentEntity, root: 'comments'
      end
    end
  end
end
