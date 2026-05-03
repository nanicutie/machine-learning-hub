'use client';
import { supabase } from '../lib/supabaseClient';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ArticleCard({ article, currentUserId, currentUserRole, onDeleted }) {
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

  const isOwner = currentUserId && currentUserId === article.author_id;
  const isAdmin = currentUserRole === 'admin';
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  // Send notification helper
  const sendNotification = async (recipientId, message) => {
    if (!recipientId || recipientId === currentUserId) return; // don't notify yourself
    await supabase.from('notifications').insert([{
      recipient_id: recipientId,
      sender_id: currentUserId,
      message,
      is_read: false,
    }]);
  };

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(full_name)')
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
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('article_id', article.id)
        .maybeSingle();
      if (data) setHasLiked(true);

      const { count: c } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', article.id);
      setCommentCount(c || 0);
    };
    init();
  }, [currentUserId, article.id]);

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
      // Send notification to article author
      const commenterName = article.profiles?.full_name || 'Someone';
      await sendNotification(
        article.author_id,
        `${commenterName} commented on your article "${localTitle}"`
      );
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
      // Notify original commenter
      const parentComment = comments.find(c => c.id === parentId);
      if (parentComment) {
        await sendNotification(
          parentComment.user_id,
          `Someone replied to your comment on "${localTitle}"`
        );
      }
      setReplyText('');
      setReplyingTo(null);
      await fetchComments();
    } else {
      alert('Reply failed: ' + error.message);
    }
  };

  const handleDeleteComment = async (commentId, commentAuthorId) => {
    if (currentUserId !== commentAuthorId && !isAdmin) {
      alert('You can only delete your own comments.');
      return;
    }
    if (!confirm('Delete this comment?')) return;
    await supabase.from('comments').delete().eq('parent_id', commentId);
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      if (replyingTo === commentId) setReplyingTo(null);
      await fetchComments();
    }
  };

  const handleLike = async () => {
    if (!currentUserId) { alert('Please login to like articles.'); return; }
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      if (hasLiked) {
        const { error: delError } = await supabase.from('likes').delete().eq('user_id', currentUserId).eq('article_id', article.id);
        if (delError) throw delError;
        const { error: rpcError } = await supabase.rpc('decrement_counter', { row_id: article.id });
        if (rpcError) throw rpcError;
        setCount(prev => prev - 1);
        setHasLiked(false);
      } else {
        const { error: insError } = await supabase.from('likes').insert([{ user_id: currentUserId, article_id: article.id }]);
        if (insError) throw insError;
        const { error: rpcError } = await supabase.rpc('increment_counter', { row_id: article.id });
        if (rpcError) throw rpcError;
        setCount(prev => prev + 1);
        setHasLiked(true);
        // Send notification to article author
        const likerName = article.profiles?.full_name || 'Someone';
        await sendNotification(
          article.author_id,
          `${likerName} liked your article "${localTitle}"`
        );
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
        await navigator.share({ title: article.title, text: `Check out this article by ${authorName}`, url: window.location.href });
      } catch { /* cancelled */ }
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

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(localTitle);
    setEditContent(localContent);
    setEditImageFile(null);
    setEditImagePreview(localFileUrl);
  };

  const handleSaveEdit = async () => {
    if (!canEdit) { alert('You do not have permission to edit this article.'); return; }
    setSaving(true);
    try {
      let newFileUrl = localFileUrl;
      let newFileType = localFileType;

      if (editImageFile) {
        const fileExt = editImageFile.name.split('.').pop();
        const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('articles-image').upload(fileName, editImageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('articles-image').getPublicUrl(fileName);
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
      setIsEditing(false);
      setEditImageFile(null);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const topComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <>
      <style>{`
        .ac-card { background: rgba(20,0,30,0.65); border: 1px solid rgba(168,85,247,0.18); border-radius: 14px; padding: 24px 26px; margin-bottom: 18px; transition: border-color 0.2s, box-shadow 0.2s; }
        .ac-card:hover { border-color: rgba(168,85,247,0.38); box-shadow: 0 6px 30px rgba(88,28,135,0.2); }
        .ac-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: #f3e8ff; margin-bottom: 6px; line-height: 1.3; }
        .ac-author { font-size: 12px; color: rgba(196,181,253,0.45); margin-bottom: 14px; letter-spacing: 0.04em; }
        .ac-content { font-size: 14px; color: rgba(196,181,253,0.65); line-height: 1.7; margin-bottom: 16px; }
        .ac-img-container { position: relative; width: 100%; height: 220px; border-radius: 10px; overflow: hidden; margin-bottom: 16px; border: 1px solid rgba(168,85,247,0.15); }
        .ac-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ac-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; color: rgba(196,181,253,0.65); background: rgba(88,28,135,0.12); border: 1px solid rgba(168,85,247,0.18); border-radius: 8px; padding: 6px 13px; cursor: pointer; transition: background 0.2s, border-color 0.2s, color 0.2s; }
        .ac-btn:hover { background: rgba(88,28,135,0.28); border-color: rgba(168,85,247,0.4); color: #d8b4fe; }
        .ac-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ac-btn.liked { background: rgba(168,85,247,0.22); border-color: rgba(168,85,247,0.5); color: #d8b4fe; }
        .ac-spacer { flex: 1; }
        .ac-comments { margin-top: 18px; padding-top: 18px; border-top: 1px solid rgba(168,85,247,0.1); }
        .ac-comment-item { background: rgba(88,28,135,0.1); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; border: 1px solid rgba(168,85,247,0.1); }
        .ac-reply-item { margin-left: 16px; margin-top: 8px; background: rgba(88,28,135,0.07); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(168,85,247,0.08); }
        .ac-input { background: rgba(88,28,135,0.15); border: 1px solid rgba(168,85,247,0.2); border-radius: 8px; color: #f3e8ff; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 8px 12px; outline: none; transition: border-color 0.2s; }
        .ac-input:focus { border-color: rgba(168,85,247,0.5); }
        .ac-edit-input { width: 100%; background: rgba(88,28,135,0.15); border: 1px solid rgba(168,85,247,0.2); border-radius: 8px; color: #f3e8ff; font-family: 'Cormorant Garamond', serif; font-size: 20px; padding: 10px 13px; outline: none; margin-bottom: 10px; }
        .ac-edit-textarea { width: 100%; background: rgba(88,28,135,0.15); border: 1px solid rgba(168,85,247,0.2); border-radius: 8px; color: #f3e8ff; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 10px 13px; outline: none; resize: vertical; }
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
            <input className="ac-edit-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Article title" />
            <textarea className="ac-edit-textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} placeholder="Article content" />
            <div style={{ marginTop: '10px' }}>
              <label className="ac-img-upload-label">
                📷 {editImageFile ? 'Change Image' : localFileUrl ? 'Replace Image' : 'Add Image'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditImageChange} />
              </label>
              {editImagePreview && (
                <div className="ac-edit-preview">
                  <Image src={editImagePreview} alt="Preview" fill sizes="100vw" style={{ objectFit: 'cover' }} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button className="ac-save-btn" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
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
            {localFileUrl && localFileType?.startsWith('image/') && (
              <div className="ac-img-container">
                <Image src={localFileUrl} alt="Article image" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: 'cover' }} priority={false} />
              </div>
            )}
            <div className="ac-actions">
              <button onClick={handleLike} disabled={likeLoading} className={`ac-btn${hasLiked ? ' liked' : ''}`}>👍 {count}</button>
              <button onClick={handleToggleComments} className="ac-btn">💬 {commentCount > 0 ? commentCount : ''} {showComments ? 'Hide' : 'Comments'}</button>
              <button onClick={handleShare} className="ac-btn">🔗 Share</button>
              <div className="ac-spacer" />
              {canEdit && <button onClick={() => setIsEditing(true)} className="ac-btn">✏️ Edit</button>}
              {canDelete && <button onClick={handleDelete} className="ac-btn ac-delete-btn">🗑 Delete</button>}
            </div>

            {showComments && (
              <div className="ac-comments">
                {currentUserId && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <input
                      className="ac-input" style={{ flex: 1 }}
                      value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="Add a comment…"
                    />
                    <button onClick={handleAddComment} disabled={postingComment} className="ac-btn">{postingComment ? '…' : 'Post'}</button>
                  </div>
                )}
                {topComments.length === 0 && (
                  <p style={{ color: 'rgba(196,181,253,0.4)', fontSize: '13px' }}>No comments yet. Be the first!</p>
                )}
                {topComments.map(comment => (
                  <div key={comment.id} className="ac-comment-item">
                    <p style={{ fontSize: '13px', marginBottom: '6px' }}>
                      <strong style={{ color: '#d8b4fe' }}>{comment.profiles?.full_name || 'User'}:</strong>{' '}{comment.content}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {currentUserId && (
                        <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} style={{ background: 'none', border: 'none', color: 'rgba(168,85,247,0.7)', fontSize: '11px', cursor: 'pointer' }}>
                          {replyingTo === comment.id ? 'Cancel' : '↩ Reply'}
                        </button>
                      )}
                      {(currentUserId === comment.user_id || isAdmin) && (
                        <button onClick={() => handleDeleteComment(comment.id, comment.user_id)} style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                      )}
                    </div>
                    {replyingTo === comment.id && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                          className="ac-input" style={{ flex: 1 }}
                          value={replyText} onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                          placeholder={`Reply to ${comment.profiles?.full_name || 'User'}…`}
                          autoFocus
                        />
                        <button onClick={() => handleAddReply(comment.id)} className="ac-btn">Reply</button>
                      </div>
                    )}
                    {getReplies(comment.id).map(reply => (
                      <div key={reply.id} className="ac-reply-item">
                        <p style={{ fontSize: '13px', margin: 0 }}>
                          <strong style={{ color: '#c4b5fd' }}>{reply.profiles?.full_name || 'User'}:</strong>{' '}{reply.content}
                        </p>
                        {(currentUserId === reply.user_id || isAdmin) && (
                          <button onClick={() => handleDeleteComment(reply.id, reply.user_id)} style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: '11px', cursor: 'pointer', marginTop: '4px' }}>Delete</button>
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