'use client';
import { supabase } from '../lib/supabaseClient';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ArticleCard({ article, currentUserId, currentUserRole, onDeleted }) {
  // --- States ---
  const [count, setCount] = useState(article.counter || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(article.title);
  const [editContent, setEditContent] = useState(article.content);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(article.file_url || null);
  const [saving, setSaving] = useState(false);
  const [localTitle, setLocalTitle] = useState(article.title);
  const [localContent, setLocalContent] = useState(article.content);
  const [localFileUrl, setLocalFileUrl] = useState(article.file_url || null);
  const [localFileType, setLocalFileType] = useState(article.file_type || null);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // --- Helpers ---
  const isOwner = currentUserId && currentUserId === article.author_id;
  const isAdmin = currentUserRole === 'admin';
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  // --- Effects & Data Fetching ---
  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', article.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setComments(data);
      setCommentCount(data.length);
    }
  }, [article.id]);

  useEffect(() => {
    const init = async () => {
      if (!currentUserId) return;

      // Check for like status
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('article_id', article.id)
        .maybeSingle(); // FIX: use maybeSingle() instead of single() to avoid error when no row found
      if (data) setHasLiked(true);

      // Get comment count
      const { count: c } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', article.id);
      setCommentCount(c || 0);
    };
    init();
  }, [currentUserId, article.id]);

  // --- Event Handlers ---
  const handleToggleComments = async () => {
    if (!showComments) await fetchComments();
    setShowComments(prev => !prev);
  };

  const handleAddComment = async () => {
    if (!currentUserId) { alert('Please login to comment.'); return; }
    if (!newComment.trim() || postingComment) return;
    setPostingComment(true);
    const { error } = await supabase
      .from('comments')
      .insert([{ article_id: article.id, user_id: currentUserId, content: newComment.trim(), parent_id: null }]);
    setPostingComment(false);
    if (!error) {
      setNewComment('');
      await fetchComments();
    } else {
      alert('Comment failed: ' + error.message);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!currentUserId) { alert('Please login to reply.'); return; }
    if (!replyText.trim()) return;
    const { error } = await supabase
      .from('comments')
      .insert([{ article_id: article.id, user_id: currentUserId, content: replyText.trim(), parent_id: parentId }]);
    if (!error) {
      setReplyText('');
      setReplyingTo(null);
      await fetchComments();
    } else {
      alert('Reply failed: ' + error.message);
    }
  };

  const handleDeleteComment = async (commentId, commentAuthorId) => {
    // FIX: Only allow comment owner or admin to delete
    if (currentUserId !== commentAuthorId && !isAdmin) {
      alert('You can only delete your own comments.');
      return;
    }
    if (!confirm('Delete this comment?')) return;
    // Delete replies first, then the comment
    await supabase.from('comments').delete().eq('parent_id', commentId);
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      // FIX: Reset replyingTo if deleted comment was the reply target
      if (replyingTo === commentId) setReplyingTo(null);
      await fetchComments();
    }
  };

  const handleLike = async () => {
    if (!currentUserId) { alert('Please login to like articles.'); return; }
    // FIX: Prevent double-clicks with loading guard
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (hasLiked) {
        const { error: delError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('article_id', article.id);
        if (delError) throw delError;
        const { error: rpcError } = await supabase.rpc('decrement_counter', { row_id: article.id });
        if (rpcError) throw rpcError;
        setCount(prev => prev - 1);
        setHasLiked(false);
      } else {
        const { error: insError } = await supabase
          .from('likes')
          .insert([{ user_id: currentUserId, article_id: article.id }]);
        if (insError) throw insError;
        const { error: rpcError } = await supabase.rpc('increment_counter', { row_id: article.id });
        if (rpcError) throw rpcError;
        setCount(prev => prev + 1);
        setHasLiked(true);
      }
    } catch (err) {
      alert('Like action failed: ' + err.message);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShare = async () => {
    const authorName = article.profiles?.full_name || 'the author';
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: `Check out this article by ${authorName}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share — no-op
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDelete = async () => {
    if (!canDelete) { alert('You do not have permission to delete this article.'); return; }
    if (!confirm('Are you sure you want to delete this article?')) return;
    const { error } = await supabase.from('articles').delete().eq('id', article.id);
    if (error) alert('Delete failed: ' + error.message);
    else if (onDeleted) onDeleted(article.id);
  };

  // FIX: Handle image file selection for editing
  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const handleSaveEdit = async () => {
    if (!canEdit) { alert('You do not have permission to edit this article.'); return; }
    setSaving(true);
    try {
      let newFileUrl = localFileUrl;
      let newFileType = localFileType;

      // FIX: Upload new image if one was selected
      if (editImageFile) {
        const ext = editImageFile.name.split('.').pop();
        const fileName = `article_${article.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('articles-image')
          .upload(fileName, editImageFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('articles-image')
          .getPublicUrl(fileName);
        newFileUrl = urlData.publicUrl;
        newFileType = editImageFile.type;
      }

      const { error } = await supabase
        .from('articles')
        .update({ title: editTitle, content: editContent, file_url: newFileUrl, file_type: newFileType })
        .eq('id', article.id);

      if (error) throw error;

      setLocalTitle(editTitle);
      setLocalContent(editContent);
      setLocalFileUrl(newFileUrl);
      setLocalFileType(newFileType);
      setEditImageFile(null);
      setIsEditing(false);
    } catch (err) {
      alert('Edit failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset edit fields back to current local values
    setEditTitle(localTitle);
    setEditContent(localContent);
    setEditImageFile(null);
    setEditImagePreview(localFileUrl);
    setIsEditing(false);
  };

  const topComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <>
      <style>{`
        .ac-card {
          background: rgba(20,0,30,0.72);
          border: 1px solid rgba(168,85,247,0.18);
          border-radius: 16px;
          padding: 26px 28px;
          margin-bottom: 16px;
          backdrop-filter: blur(12px);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .ac-title { font-size: 20px; font-weight: 700; color: #f3e8ff; margin-bottom: 6px; }
        .ac-content { font-size: 14px; color: rgba(196,181,253,0.7); line-height: 1.75; white-space: pre-wrap; margin-bottom: 15px; }
        .ac-img-container { position: relative; width: 100%; height: 300px; border-radius: 10px; overflow: hidden; margin: 15px 0; border: 1px solid rgba(168,85,247,0.1); }
        .ac-actions { display: flex; gap: 10px; padding-top: 15px; border-top: 1px solid rgba(168,85,247,0.1); align-items: center; flex-wrap: wrap; }
        .ac-btn { background: rgba(88,28,135,0.12); border: 1px solid rgba(168,85,247,0.2); color: #d8b4fe; padding: 6px 12px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 13px; transition: background 0.2s; }
        .ac-btn:hover { background: rgba(88,28,135,0.3); }
        .ac-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ac-btn.liked { border-color: #fdba74; color: #fdba74; }
        .ac-spacer { flex: 1; }
        .ac-author { font-size: 12px; color: rgba(196,181,253,0.45); margin-bottom: 15px; }
        .ac-comments { margin-top: 20px; padding-top: 15px; border-top: 1px dashed rgba(168,85,247,0.2); }
        .ac-comment-item { margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; }
        .ac-reply-item { margin-top: 8px; margin-left: 20px; padding: 8px; background: rgba(168,85,247,0.05); border-radius: 6px; border-left: 2px solid rgba(168,85,247,0.3); }
        .ac-input { background: rgba(88,28,135,0.1); border: 1px solid rgba(168,85,247,0.2); padding: 8px 12px; color: white; border-radius: 8px; font-size: 13px; outline: none; }
        .ac-input:focus { border-color: rgba(168,85,247,0.5); }
        .ac-edit-input { width: 100%; background: rgba(88,28,135,0.1); border: 1px solid rgba(168,85,247,0.25); padding: 10px; color: #f3e8ff; border-radius: 8px; font-size: 16px; font-weight: 700; margin-bottom: 10px; outline: none; box-sizing: border-box; }
        .ac-edit-textarea { width: 100%; background: rgba(88,28,135,0.1); border: 1px solid rgba(168,85,247,0.25); padding: 10px; color: rgba(196,181,253,0.9); border-radius: 8px; font-size: 14px; line-height: 1.75; resize: vertical; outline: none; box-sizing: border-box; }
        .ac-edit-input:focus, .ac-edit-textarea:focus { border-color: rgba(168,85,247,0.5); }
        .ac-save-btn { background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.4); color: #d8b4fe; padding: 7px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
        .ac-save-btn:hover { background: rgba(168,85,247,0.35); }
        .ac-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ac-cancel-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(196,181,253,0.6); padding: 7px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
        .ac-img-upload-label { display: inline-block; cursor: pointer; background: rgba(88,28,135,0.12); border: 1px dashed rgba(168,85,247,0.3); color: #d8b4fe; padding: 8px 14px; border-radius: 8px; font-size: 13px; margin-top: 8px; }
        .ac-img-upload-label:hover { background: rgba(88,28,135,0.25); }
        .ac-edit-preview { position: relative; width: 100%; height: 200px; border-radius: 8px; overflow: hidden; margin-top: 10px; border: 1px solid rgba(168,85,247,0.2); }
        .ac-delete-btn { border-color: rgba(220,38,38,0.3) !important; color: #fca5a5 !important; }
        .ac-delete-btn:hover { background: rgba(220,38,38,0.15) !important; }
      `}</style>

      <div className="ac-card">
        {isEditing ? (
          <div>
            <input
              className="ac-edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Article title"
            />
            <textarea
              className="ac-edit-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              placeholder="Article content"
            />

            {/* FIX: Image upload in edit mode */}
            <div style={{ marginTop: '10px' }}>
              <label className="ac-img-upload-label">
                📷 {editImageFile ? 'Change Image' : localFileUrl ? 'Replace Image' : 'Add Image'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleEditImageChange}
                />
              </label>
              {editImagePreview && (
                <div className="ac-edit-preview">
                  <Image
                    src={editImagePreview}
                    alt="Preview"
                    fill
                    sizes="100vw"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button className="ac-save-btn" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="ac-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="ac-title">{localTitle}</h3>
            <p className="ac-author">
              By{' '}
              <Link href={`/user/${article.author_id}`} style={{ color: '#a855f7' }}>
                {article.profiles?.full_name || 'Author'}
              </Link>
            </p>

            <p className="ac-content">{localContent}</p>

            {/* FIX: Use localFileUrl & localFileType so edits reflect immediately */}
            {localFileUrl && localFileType?.startsWith('image/') && (
              <div className="ac-img-container">
                <Image
                  src={localFileUrl}
                  alt="Article image"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  priority={false}
                />
              </div>
            )}

            <div className="ac-actions">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`ac-btn${hasLiked ? ' liked' : ''}`}
              >
                👍 {count}
              </button>
              <button onClick={handleToggleComments} className="ac-btn">
                💬 {commentCount > 0 ? commentCount : ''} {showComments ? 'Hide' : 'Comments'}
              </button>
              <button onClick={handleShare} className="ac-btn">🔗 Share</button>

              <div className="ac-spacer" />

              {canEdit && (
                <button onClick={() => setIsEditing(true)} className="ac-btn">✏️ Edit</button>
              )}
              {canDelete && (
                <button onClick={handleDelete} className="ac-btn ac-delete-btn">🗑 Delete</button>
              )}
            </div>

            {showComments && (
              <div className="ac-comments">
                {/* New comment input */}
                {currentUserId && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <input
                      className="ac-input"
                      style={{ flex: 1 }}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="Add a comment…"
                    />
                    <button onClick={handleAddComment} disabled={postingComment} className="ac-btn">
                      {postingComment ? '…' : 'Post'}
                    </button>
                  </div>
                )}

                {/* Comments list */}
                {topComments.length === 0 && (
                  <p style={{ color: 'rgba(196,181,253,0.4)', fontSize: '13px' }}>No comments yet. Be the first!</p>
                )}
                {topComments.map(comment => (
                  <div key={comment.id} className="ac-comment-item">
                    <p style={{ fontSize: '13px', marginBottom: '6px' }}>
                      <strong style={{ color: '#d8b4fe' }}>
                        {comment.profiles?.full_name || 'User'}:
                      </strong>{' '}
                      {comment.content}
                    </p>

                    {/* Comment actions */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {currentUserId && (
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          style={{ background: 'none', border: 'none', color: 'rgba(168,85,247,0.7)', fontSize: '11px', cursor: 'pointer' }}
                        >
                          {replyingTo === comment.id ? 'Cancel' : '↩ Reply'}
                        </button>
                      )}
                      {/* FIX: Pass author id so only owner/admin can delete */}
                      {(currentUserId === comment.user_id || isAdmin) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                          style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {/* FIX: Reply input (was missing entirely) */}
                    {replyingTo === comment.id && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                          className="ac-input"
                          style={{ flex: 1 }}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                          placeholder={`Reply to ${comment.profiles?.full_name || 'User'}…`}
                          autoFocus
                        />
                        <button onClick={() => handleAddReply(comment.id)} className="ac-btn">Reply</button>
                      </div>
                    )}

                    {/* Replies */}
                    {getReplies(comment.id).map(reply => (
                      <div key={reply.id} className="ac-reply-item">
                        <p style={{ fontSize: '13px', margin: 0 }}>
                          <strong style={{ color: '#c4b5fd' }}>
                            {reply.profiles?.full_name || 'User'}:
                          </strong>{' '}
                          {reply.content}
                        </p>
                        {(currentUserId === reply.user_id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(reply.id, reply.user_id)}
                            style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: '11px', cursor: 'pointer', marginTop: '4px' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}