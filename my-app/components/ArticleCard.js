'use client';

/**
 * Note: If you see "Module not found: Can't resolve '@/lib/supabaseClient'", 
 * make sure the path is correct relative to your project root.
 * You might need to change it to '../lib/supabaseClient' or similar 
 * if your tsconfig/jsconfig paths are not set up.
 */
import { supabase } from '../lib/supabaseClient'; 
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';

export default function ArticleCard({ article: initialArticle, currentUserId, currentUserRole, onDeleted, onUpdated }) {
  // 1. Local overrides for editing/liking
  const [localTitle, setLocalTitle] = useState(null);
  const [localContent, setLocalContent] = useState(null);
  const [localCount, setLocalCount] = useState(null);
  const [localDislikeCount, setLocalDislikeCount] = useState(null);
  const [localFileUrl, setLocalFileUrl] = useState(null);
  const [localFileType, setLocalFileType] = useState(null);
  const [localFileName, setLocalFileName] = useState(null);

  // 2. Derived state (avoids useEffect cascading renders)
  const article = useMemo(() => ({
    ...initialArticle,
    title: localTitle ?? initialArticle.title,
    content: localContent ?? initialArticle.content,
    counter: localCount ?? initialArticle.counter ?? 0,
    dislike_counter: localDislikeCount ?? initialArticle.dislike_counter ?? 0,
    file_url: localFileUrl ?? initialArticle.file_url,
    file_type: localFileType ?? initialArticle.file_type,
    file_name: localFileName ?? initialArticle.file_name,
  }), [initialArticle, localTitle, localContent, localCount, localDislikeCount, localFileUrl, localFileType, localFileName]);

  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(article.title);
  const [editContent, setEditContent] = useState(article.content);
  const [saving, setSaving] = useState(false);

  // Image edit state
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const isOwner = currentUserId === article.author_id;
  const isAdmin = currentUserRole === 'admin';
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  // Check like/dislike status on mount or when user/article changes
  useEffect(() => {
    const checkReactions = async () => {
      if (!currentUserId || !article.id) return;
      try {
        const [likeRes, dislikeRes] = await Promise.all([
          supabase
            .from('likes')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('article_id', article.id)
            .maybeSingle(),
          supabase
            .from('dislikes')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('article_id', article.id)
            .maybeSingle(),
        ]);

        if (likeRes.error) throw likeRes.error;
        if (dislikeRes.error) throw dislikeRes.error;

        setHasLiked(!!likeRes.data);
        setHasDisliked(!!dislikeRes.data);
      } catch (err) {
        console.error('Error checking reaction status:', err?.message ?? err);
      }
    };
    checkReactions();
  }, [currentUserId, article.id]);

  const fetchComments = useCallback(async () => {
    if (!article.id) return;
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('article_id', article.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Fetch profiles separately (avoids FK relationship requirement)
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      setComments(commentsData.map(c => ({ ...c, profiles: profileMap[c.user_id] ?? null })));
    } catch (err) {
      console.error('Error fetching comments:', err?.message ?? err);
    }
  }, [article.id]);

  const handleToggleComments = async () => {
    if (!showComments) await fetchComments();
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!currentUserId) return alert('Please login to comment.');
    if (!newComment.trim()) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{ 
          article_id: article.id, 
          user_id: currentUserId, 
          content: newComment.trim(), 
          parent_id: null 
        }]);
        
      if (error) throw error;
      setNewComment(''); 
      await fetchComments(); 
    } catch (err) {
      alert('Comment failed: ' + err.message);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!currentUserId) return alert('Please login to reply.');
    if (!replyText.trim()) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{ 
          article_id: article.id, 
          user_id: currentUserId, 
          content: replyText.trim(), 
          parent_id: parentId 
        }]);
        
      if (error) throw error;
      setReplyText(''); 
      setReplyingTo(null); 
      await fetchComments(); 
    } catch (err) {
      alert('Reply failed: ' + err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
        
      if (error) throw error;
      await fetchComments();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      alert("Please login to like articles.");
      return;
    }
    
    const originalHasLiked = hasLiked;
    const originalHasDisliked = hasDisliked;
    const originalCount = article.counter;
    const originalDislikeCount = article.dislike_counter;

    // Optimistic UI — toggling like also removes dislike if active
    setHasLiked(!originalHasLiked);
    setLocalCount(originalHasLiked ? originalCount - 1 : originalCount + 1);
    if (!originalHasLiked && originalHasDisliked) {
      setHasDisliked(false);
      setLocalDislikeCount(originalDislikeCount - 1);
    }

    try {
      if (originalHasLiked) {
        const { error } = await supabase.from('likes').delete()
          .eq('user_id', currentUserId).eq('article_id', article.id);
        if (error) throw error;
        await supabase.rpc('decrement_counter', { row_id: article.id });
      } else {
        const { error } = await supabase.from('likes')
          .insert([{ user_id: currentUserId, article_id: article.id }]);
        if (error) throw error;
        await supabase.rpc('increment_counter', { row_id: article.id });

        // Remove dislike if was disliked
        if (originalHasDisliked) {
          await supabase.from('dislikes').delete()
            .eq('user_id', currentUserId).eq('article_id', article.id);
          await supabase.rpc('decrement_dislike_counter', { row_id: article.id });
        }
      }
    } catch (err) {
      setHasLiked(originalHasLiked);
      setHasDisliked(originalHasDisliked);
      setLocalCount(originalCount);
      setLocalDislikeCount(originalDislikeCount);
      alert('Action failed: ' + err.message);
    }
  };

  const handleDislike = async () => {
    if (!currentUserId) {
      alert("Please login to dislike articles.");
      return;
    }

    const originalHasDisliked = hasDisliked;
    const originalHasLiked = hasLiked;
    const originalDislikeCount = article.dislike_counter;
    const originalCount = article.counter;

    // Optimistic UI — toggling dislike also removes like if active
    setHasDisliked(!originalHasDisliked);
    setLocalDislikeCount(originalHasDisliked ? originalDislikeCount - 1 : originalDislikeCount + 1);
    if (!originalHasDisliked && originalHasLiked) {
      setHasLiked(false);
      setLocalCount(originalCount - 1);
    }

    try {
      if (originalHasDisliked) {
        const { error } = await supabase.from('dislikes').delete()
          .eq('user_id', currentUserId).eq('article_id', article.id);
        if (error) throw error;
        await supabase.rpc('decrement_dislike_counter', { row_id: article.id });
      } else {
        const { error } = await supabase.from('dislikes')
          .insert([{ user_id: currentUserId, article_id: article.id }]);
        if (error) throw error;
        await supabase.rpc('increment_dislike_counter', { row_id: article.id });

        // Remove like if was liked
        if (originalHasLiked) {
          await supabase.from('likes').delete()
            .eq('user_id', currentUserId).eq('article_id', article.id);
          await supabase.rpc('decrement_counter', { row_id: article.id });
        }
      }
    } catch (err) {
      setHasDisliked(originalHasDisliked);
      setHasLiked(originalHasLiked);
      setLocalDislikeCount(originalDislikeCount);
      setLocalCount(originalCount);
      alert('Action failed: ' + err.message);
    }
  };

  const handleShare = async () => {
    const authorName = article.profiles?.full_name || 'the author';
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: article.title, 
          text: `Check out this article by ${authorName}`, 
          url: shareUrl 
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Error sharing:', err?.message ?? err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      } catch (err) {
        console.error('Clipboard error:', err?.message ?? err);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', article.id);
        
      if (error) throw error;
      if (onDeleted) onDeleted(article.id);
    } catch (err) {
      alert('Delete failed: ' + err.message); 
    }
  };

  // Handle image file selection in edit mode
  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onloadend = () => setEditImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setEditImageFile(null);
    setEditImagePreview(null);
    setRemoveImage(true);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return alert('Title is required.');
    
    setSaving(true);
    try {
      let newFileUrl = article.file_url;
      let newFileType = article.file_type;
      let newFileName = article.file_name;

      // Upload new image if selected
      if (editImageFile) {
        setUploadingImage(true);
        const ext = editImageFile.name.split('.').pop();
        const filePath = `articles/${article.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('article-attachments') // change bucket name if needed
          .upload(filePath, editImageFile, { upsert: true });
        setUploadingImage(false);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('article-attachments')
          .getPublicUrl(filePath);

        newFileUrl = urlData.publicUrl;
        newFileType = editImageFile.type;
        newFileName = editImageFile.name;
      } else if (removeImage) {
        newFileUrl = null;
        newFileType = null;
        newFileName = null;
      }

      const { error } = await supabase
        .from('articles')
        .update({ 
          title: editTitle.trim(), 
          content: editContent.trim(),
          file_url: newFileUrl,
          file_type: newFileType,
          file_name: newFileName,
        })
        .eq('id', article.id);
      
      if (error) throw error;
      
      setIsEditing(false);
      setLocalTitle(editTitle.trim());
      setLocalContent(editContent.trim());
      setLocalFileUrl(newFileUrl);
      setLocalFileType(newFileType);
      setLocalFileName(newFileName);
      setEditImageFile(null);
      setEditImagePreview(null);
      setRemoveImage(false);
      
      if (onUpdated) {
        onUpdated({ 
          ...article, 
          title: editTitle.trim(), 
          content: editContent.trim(),
          file_url: newFileUrl,
          file_type: newFileType,
          file_name: newFileName,
        });
      }
    } catch (err) {
      alert('Edit failed: ' + err.message);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const topComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  // Current image to preview in edit mode
  const currentEditImage = editImagePreview || (!removeImage ? article.file_url : null);
  const currentEditIsImage = editImagePreview
    ? true
    : (!removeImage && article.file_type?.startsWith('image/'));

  return (
    <div className="card">
      {isEditing ? (
        <div className="edit-container">
          <input 
            className="edit-input" 
            value={editTitle} 
            onChange={(e) => setEditTitle(e.target.value)} 
            placeholder="Title" 
          />
          <textarea 
            className="edit-textarea" 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)} 
            rows={8} 
            placeholder="Content..." 
          />

          {/* Image section in edit mode */}
          <div className="edit-image-section">
            <p className="edit-image-label">📎 Attachment / Image</p>
            {currentEditImage && currentEditIsImage && (
              <div className="edit-image-preview-wrapper">
                <img src={currentEditImage} alt="preview" className="edit-image-preview" />
                <button type="button" onClick={handleRemoveImage} className="btn-remove-image">✕ Remove</button>
              </div>
            )}
            {currentEditImage && !currentEditIsImage && !editImageFile && (
              <div className="edit-file-existing">
                <span>📄 {article.file_name || 'Current attachment'}</span>
                <button type="button" onClick={handleRemoveImage} className="btn-remove-image">✕ Remove</button>
              </div>
            )}
            <label className="btn-upload-image">
              {currentEditImage ? '🔄 Replace Image' : '📷 Upload Image'}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleEditImageChange}
              />
            </label>
          </div>

          <div className="button-group">
            <button onClick={handleSaveEdit} disabled={saving || uploadingImage} className="btn btn-save">
              {uploadingImage ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => {
              setIsEditing(false);
              setEditImageFile(null);
              setEditImagePreview(null);
              setRemoveImage(false);
            }} className="btn btn-cancel">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="header">
            <h3 className="title">{article.title}</h3>
            <div className="author-info">
              By <Link href={`/user/${article.author_id}`} className="author-link">
                {article.profiles?.full_name || 'Unknown Author'}
              </Link>
              {article.profiles?.username && <span className="username"> @{article.profiles.username}</span>}
            </div>
          </div>

          <p className="content">{article.content}</p>

          {article.file_url && (
            <div className="attachment">
              {article.file_type?.startsWith('image/') ? (
                <img src={article.file_url} alt="attachment" className="image-attachment" />
              ) : (
                <a href={article.file_url} target="_blank" rel="noopener noreferrer" className="file-link">
                  📄 {article.file_name || 'View Attachment'}
                </a>
              )}
            </div>
          )}

          <div className="actions">
            <button onClick={handleLike} className={`action-btn ${hasLiked ? 'liked' : ''}`}>
              {hasLiked ? '🔥' : '👍'} {article.counter}
            </button>
            <button onClick={handleDislike} className={`action-btn ${hasDisliked ? 'disliked' : ''}`}>
              👎 {article.dislike_counter}
            </button>
            <button onClick={handleToggleComments} className={`action-btn ${showComments ? 'active' : ''}`}>
              💬 {comments.length > 0 ? comments.length : ''} {showComments ? 'Hide' : 'Comments'}
            </button>
            <button onClick={handleShare} className="action-btn">🔗 Share</button>
            {canEdit && <button onClick={() => {
              setEditTitle(article.title);
              setEditContent(article.content);
              setEditImageFile(null);
              setEditImagePreview(null);
              setRemoveImage(false);
              setIsEditing(true);
            }} className="btn-edit">✏️ Edit</button>}
            {canDelete && <button onClick={handleDelete} className="btn-delete">🗑️ Delete</button>}
          </div>

          {showComments && (
            <div className="comment-section">
              <div className="comment-form">
                <input 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Add a comment..." 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment}>Post</button>
              </div>

              {topComments.length === 0 ? (
                <p className="empty-text">No comments yet. Start the conversation!</p>
              ) : (
                topComments.map(comment => (
                  <div key={comment.id} className="comment-wrapper">
                    <div className="comment-box">
                      <div className="comment-user">
                        <strong>{comment.profiles?.full_name || 'User'}</strong>
                        {comment.profiles?.username && <span className="username"> @{comment.profiles.username}</span>}
                      </div>
                      <p className="comment-text">{comment.content}</p>
                      <div className="comment-actions">
                        <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>Reply</button>
                        {(currentUserId === comment.user_id || isAdmin) && (
                          <button className="del-btn" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
                        )}
                      </div>
                    </div>

                    {replyingTo === comment.id && (
                      <div className="reply-form">
                        <input 
                          value={replyText} 
                          onChange={(e) => setReplyText(e.target.value)} 
                          placeholder="Reply..." 
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                        />
                        <button className="btn-post-reply" onClick={() => handleAddReply(comment.id)}>Send</button>
                      </div>
                    )}

                    {getReplies(comment.id).map(reply => (
                      <div key={reply.id} className="reply-box">
                        <div className="comment-user">
                          <strong>{reply.profiles?.full_name || 'User'}</strong>
                          {reply.profiles?.username && <span className="username"> @{reply.profiles.username}</span>}
                        </div>
                        <p className="comment-text">{reply.content}</p>
                        {(currentUserId === reply.user_id || isAdmin) && (
                          <button className="del-btn" onClick={() => handleDeleteComment(reply.id)}>Delete</button>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .card { border: 1px solid #b44dc2; padding: 20px; border-radius: 12px; background: #55125e9a; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 20px; font-family: inherit; }
        .header { margin-bottom: 12px; }
        .title { font-size: 1.25rem; font-weight: 700; color: #0a090a; margin: 0 0 4px 0; }
        .author-info { font-size: 0.85rem; color: #6b7280; }
        .author-link { color: #2f4f83; text-decoration: none; font-weight: 600; }
        .author-link:hover { text-decoration: underline; }
        .username { color: #000000; font-size: 0.75rem; margin-left: 4px; }
        .content { color: #374151; line-height: 1.6; margin-bottom: 15px; white-space: pre-wrap; }
        .attachment { margin: 15px 0; background: #862982; border: 1px solid #020203a1; border-radius: 8px; padding: 8px; }
        .image-attachment { max-width: 100%; height: auto; border-radius: 6px; display: block; }
        .file-link { display: inline-block; padding: 8px; color: #6366f1; font-weight: 500; text-decoration: none; }
        .file-link:hover { text-decoration: underline; }
        
        .actions { display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid #f3f4f6; padding-top: 15px; align-items: center; }
        .action-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; transition: all 0.2s; font-size: 14px; display: flex; align-items: center; gap: 4px; }
        .action-btn:hover { background: #a47ecf98; border-color: #d1d5db; }
        .action-btn.liked { background: #570f0656; border-color: #fdba74; color: #ea580c; }
        .action-btn.disliked { background: #1e3a5f55; border-color: #93c5fd; color: #1d4ed8; }
        .action-btn.active { background: #d469d8; border-color: #c7d2fe; color: #4f46e5; }
        
        .btn-edit { margin-left: auto; background: #a972db; color: #374151; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .btn-edit:hover { background: #e5e7eb; }
        .btn-delete { background: #a972db; color: #991b1b; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .btn-delete:hover { background: #a972db; }

        .comment-section { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #e5e7eb; }
        .comment-form { display: flex; gap: 8px; margin-bottom: 20px; }
        .comment-form input { flex: 1; padding: 8px 12px; border: 1px solid #530e4a; border-radius: 8px; outline: none; font-size: 14px; }
        .comment-form input:focus { border-color: #a972db; ring: 2px solid #530e4a; }
        .comment-form button { background: #a972db; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; }
        .comment-form button:hover { background: #a972db; }

        .comment-wrapper { margin-bottom: 16px; }
        .comment-box { background: #a972db; padding: 12px; border-radius: 8px; }
        .comment-user { font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; }
        .comment-text { font-size: 14px; color: #1f2937; margin: 0; }
        .comment-actions { display: flex; gap: 12px; margin-top: 8px; }
        .comment-actions button, .del-btn { background: #a972db; border: none; font-size: 12px; color: #6366f1; cursor: pointer; padding: 0; font-weight: 500; }
        .comment-actions button:hover { text-decoration: underline; }
        .del-btn { color: #ef4444; }
        .del-btn:hover { text-decoration: underline; }

        .reply-box { margin-left: 24px; margin-top: 8px; background: #a972db; border-left: 2px solid #e5e7eb; padding: 8px 12px; border-radius: 0 8px 8px 0; }
        .reply-form { margin-left: 24px; margin-top: 8px; margin-bottom: 12px; display: flex; gap: 4px; }
        .reply-form input { flex: 1; font-size: 13px; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; outline: none; }
        .btn-post-reply { font-size: 12px; background: #6366f1; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }

        .empty-text { text-align: center; color: #9ca3af; font-size: 14px; margin: 20px 0; }

        /* Edit Mode Styles */
        .edit-container { display: flex; flex-direction: column; gap: 12px; }
        .edit-input { width: 100%; font-size: 1.25rem; font-weight: 700; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px; outline: none; box-sizing: border-box; }
        .edit-input:focus { border-color: #f163d2; }
        .edit-textarea { width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px; outline: none; font-family: inherit; line-height: 1.5; resize: vertical; box-sizing: border-box; }
        .edit-textarea:focus { border-color: #f163b6; }
        .button-group { display: flex; gap: 8px; }
        .btn { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: opacity 0.2s; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-save { background: #10b981; color: white; }
        .btn-save:hover:not(:disabled) { background: #059669; }
        .btn-cancel { background: #6b7280; color: white; }
        .btn-cancel:hover { background: #4b5563; }

        /* Edit image section */
        .edit-image-section { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 2px dashed #c084fc; border-radius: 8px; background: #2d0a3620; }
        .edit-image-label { font-size: 13px; font-weight: 600; color: #e9d5ff; margin: 0; }
        .edit-image-preview-wrapper { position: relative; display: inline-block; }
        .edit-image-preview { max-width: 100%; max-height: 220px; border-radius: 8px; display: block; object-fit: cover; }
        .btn-remove-image { margin-top: 6px; display: inline-block; background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
        .btn-remove-image:hover { background: #dc2626; }
        .edit-file-existing { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #e9d5ff; }
        .btn-upload-image { display: inline-block; background: #7c3aed; color: white; border: none; padding: 7px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
        .btn-upload-image:hover { background: #6d28d9; }
      `}</style>
    </div>
  );
}