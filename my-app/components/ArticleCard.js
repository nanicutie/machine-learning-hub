'use client';

import { supabase } from '../lib/supabaseClient'; 
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';

export default function ArticleCard({ article: initialArticle, currentUserId, currentUserRole, onDeleted, onUpdated }) {
  const [localTitle, setLocalTitle] = useState(null);
  const [localContent, setLocalContent] = useState(null);
  const [localCount, setLocalCount] = useState(null);
  const [localDislikeCount, setLocalDislikeCount] = useState(null);
  const [localFileUrl, setLocalFileUrl] = useState(null);
  const [localFileType, setLocalFileType] = useState(null);
  const [localFileName, setLocalFileName] = useState(null);

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

  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef(null);
  const isLikingRef = useRef(false);
  const isDislikingRef = useRef(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const isOwner = currentUserId === article.author_id;
  const isAdmin = currentUserRole === 'admin';
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  const [authorProfile, setAuthorProfile] = useState(initialArticle.profiles ?? null);
  useEffect(() => {
    if (authorProfile || !initialArticle.author_id) return;
    supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', initialArticle.author_id)
      .single()
      .then(({ data }) => { if (data) setAuthorProfile(data); });
  }, [initialArticle.author_id]);

  const displayName = 
    article.profiles?.full_name || 
    authorProfile?.full_name || 
    initialArticle.author_email?.split('@')[0] ||
    'Unknown Author';
  const displayUsername = article.profiles?.username || authorProfile?.username;

  useEffect(() => {
    const checkReactions = async () => {
      if (!currentUserId || !article.id) return;
      try {
        const [likeRes, dislikeRes] = await Promise.all([
          supabase.from('likes').select('id').eq('user_id', currentUserId).eq('article_id', article.id).maybeSingle(),
          supabase.from('dislikes').select('id').eq('user_id', currentUserId).eq('article_id', article.id).maybeSingle(),
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
        .from('comments').select('*').eq('article_id', article.id).order('created_at', { ascending: true });
      if (error) throw error;
      if (!commentsData || commentsData.length === 0) { setComments([]); return; }

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles').select('id, username, full_name').in('id', userIds);
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
      const { error } = await supabase.from('comments').insert([{ 
        article_id: article.id, user_id: currentUserId, content: newComment.trim(), parent_id: null 
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
      const { error } = await supabase.from('comments').insert([{ 
        article_id: article.id, user_id: currentUserId, content: replyText.trim(), parent_id: parentId 
      }]);
      if (error) throw error;
      setReplyText(''); setReplyingTo(null); await fetchComments(); 
    } catch (err) {
      alert('Reply failed: ' + err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      await fetchComments();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) { alert("Please login to like articles."); return; }
    if (isLikingRef.current) return;
    isLikingRef.current = true;

    const originalHasLiked = hasLiked;
    const originalHasDisliked = hasDisliked;
    const originalCount = article.counter;
    const originalDislikeCount = article.dislike_counter;

    // Optimistic UI
    setHasLiked(!originalHasLiked);
    setLocalCount(originalHasLiked ? originalCount - 1 : originalCount + 1);
    if (!originalHasLiked && originalHasDisliked) {
      setHasDisliked(false);
      setLocalDislikeCount(Math.max(0, originalDislikeCount - 1));
    }

    try {
      if (originalHasLiked) {
        const { error } = await supabase.from('likes').delete()
          .eq('user_id', currentUserId).eq('article_id', article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes')
          .upsert([{ user_id: currentUserId, article_id: article.id }], { onConflict: 'user_id,article_id', ignoreDuplicates: true });
        if (error) throw error;
        if (originalHasDisliked) {
          await supabase.from('dislikes').delete()
            .eq('user_id', currentUserId).eq('article_id', article.id);
        }
      }
      // Sync real counts from likes/dislikes tables
      const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('article_id', article.id),
        supabase.from('dislikes').select('*', { count: 'exact', head: true }).eq('article_id', article.id),
      ]);
      const finalLikes = likeCount ?? originalCount;
      const finalDislikes = dislikeCount ?? originalDislikeCount;
      setLocalCount(finalLikes);
      setLocalDislikeCount(finalDislikes);
      // Best-effort sync to articles table — ignore errors (RLS may block)
      supabase.from('articles').update({ counter: finalLikes, dislike_counter: finalDislikes }).eq('id', article.id).then(() => {});
    } catch (err) {
      setHasLiked(originalHasLiked);
      setHasDisliked(originalHasDisliked);
      setLocalCount(originalCount);
      setLocalDislikeCount(originalDislikeCount);
      console.error('Like failed:', err.message);
    } finally {
      isLikingRef.current = false;
    }
  };

  const handleDislike = async () => {
    if (!currentUserId) { alert("Please login to dislike articles."); return; }
    if (isDislikingRef.current) return;
    isDislikingRef.current = true;

    const originalHasDisliked = hasDisliked;
    const originalHasLiked = hasLiked;
    const originalDislikeCount = article.dislike_counter;
    const originalCount = article.counter;

    setHasDisliked(!originalHasDisliked);
    setLocalDislikeCount(originalHasDisliked ? originalDislikeCount - 1 : originalDislikeCount + 1);
    if (!originalHasDisliked && originalHasLiked) {
      setHasLiked(false);
      setLocalCount(Math.max(0, originalCount - 1));
    }

    try {
      if (originalHasDisliked) {
        const { error } = await supabase.from('dislikes').delete()
          .eq('user_id', currentUserId).eq('article_id', article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dislikes')
          .upsert([{ user_id: currentUserId, article_id: article.id }], { onConflict: 'user_id,article_id', ignoreDuplicates: true });
        if (error) throw error;
        if (originalHasLiked) {
          await supabase.from('likes').delete()
            .eq('user_id', currentUserId).eq('article_id', article.id);
        }
      }
      const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('article_id', article.id),
        supabase.from('dislikes').select('*', { count: 'exact', head: true }).eq('article_id', article.id),
      ]);
      const finalLikes = likeCount ?? originalCount;
      const finalDislikes = dislikeCount ?? originalDislikeCount;
      setLocalCount(finalLikes);
      setLocalDislikeCount(finalDislikes);
      supabase.from('articles').update({ counter: finalLikes, dislike_counter: finalDislikes }).eq('id', article.id).then(() => {});
    } catch (err) {
      setHasDisliked(originalHasDisliked);
      setHasLiked(originalHasLiked);
      setLocalDislikeCount(originalDislikeCount);
      setLocalCount(originalCount);
      console.error('Dislike failed:', err.message);
    } finally {
      isDislikingRef.current = false;
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: article.title, text: `Check out this article by ${displayName}`, url: shareUrl });
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
      const { error } = await supabase.from('articles').delete().eq('id', article.id);
      if (error) throw error;
      if (onDeleted) onDeleted(article.id);
    } catch (err) {
      alert('Delete failed: ' + err.message); 
    }
  };

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

        if (editImageFile) {
          setUploadingImage(true);
          const ext = editImageFile.name.split('.').pop();
          const filePath = `articles/${article.id}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('articles-image')
            .upload(filePath, editImageFile, { upsert: false });
          setUploadingImage(false);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from('articles-image')
            .getPublicUrl(filePath);
          newFileUrl = urlData.publicUrl;
          newFileType = editImageFile.type;
          newFileName = editImageFile.name;
        } else if (removeImage) {
          newFileUrl = null;
          newFileType = null;
          newFileName = null;
        }

        const { error } = await supabase.from('articles')
          .update({ 
            title: editTitle.trim(), 
            content: editContent.trim(), 
            file_url: newFileUrl, 
            file_type: newFileType, 
            file_name: newFileName 
          })
          .eq('id', article.id);

        if (error) throw error;

        // ✅ Update local state so card reflects changes immediately
        setIsEditing(false);
        setLocalTitle(editTitle.trim());
        setLocalContent(editContent.trim());
        setLocalFileUrl(newFileUrl);
        setLocalFileType(newFileType);
        setLocalFileName(newFileName);
        setEditImageFile(null);
        setEditImagePreview(null);
        setRemoveImage(false);

        if (onUpdated) onUpdated({ 
          ...article, 
          title: editTitle.trim(), 
          content: editContent.trim(), 
          file_url: newFileUrl, 
          file_type: newFileType, 
          file_name: newFileName 
        });

      } catch (err) {
        alert('Edit failed: ' + err.message);
      } finally {
        // ✅ Always reset saving state
        setSaving(false);
        setUploadingImage(false);
      }
    };

  const topComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);
  const currentEditImage = editImagePreview || (!removeImage ? article.file_url : null);
  const currentEditIsImage = editImagePreview ? true : (!removeImage && article.file_type?.startsWith('image/'));

  return (
    <div className="card">
      {isEditing ? (
        <div className="edit-container">
          <input className="edit-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
          <textarea className="edit-textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8} placeholder="Content..." />

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
              <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditImageChange} />
            </label>
          </div>

          <div className="button-group">
            <button onClick={handleSaveEdit} disabled={saving || uploadingImage} className="btn btn-save">
              {uploadingImage ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => { setIsEditing(false); setEditImageFile(null); setEditImagePreview(null); setRemoveImage(false); }} className="btn btn-cancel">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="header">
            <h3 className="title">{article.title}</h3>
            <div className="author-info">
              By <Link href={`/user/${article.author_id}`} className="author-link">{displayName}</Link>
              {displayUsername && <span className="username"> @{displayUsername}</span>}
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
            {canEdit && <button onClick={() => { setEditTitle(article.title); setEditContent(article.content); setEditImageFile(null); setEditImagePreview(null); setRemoveImage(false); setIsEditing(true); }} className="btn-edit">✏️ Edit</button>}
            {canDelete && <button onClick={handleDelete} className="btn-delete">🗑️ Delete</button>}
          </div>

          {showComments && (
            <div className="comment-section">
              <div className="comment-form">
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
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
                        <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply..." autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)} />
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .card {
          border: 1px solid rgba(168,85,247,0.25);
          padding: 24px;
          border-radius: 16px;
          background: rgba(20,0,30,0.72);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(88,28,135,0.25), 0 0 0 1px rgba(168,85,247,0.08);
          margin-bottom: 20px;
          font-family: 'DM Sans', sans-serif;
          position: relative;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(216,180,254,0.5), transparent);
        }

        .header { margin-bottom: 14px; }
        .title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 600;
          color: #f3e8ff; margin: 0 0 6px 0; line-height: 1.3;
        }
        .author-info { font-size: 0.82rem; color: rgba(196,181,253,0.5); }
        .author-link { color: rgba(196,181,253,0.85); text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .author-link:hover { color: #d8b4fe; text-decoration: underline; }
        .username { color: rgba(196,181,253,0.4); font-size: 0.75rem; margin-left: 4px; }

        .content {
          color: rgba(233,213,255,0.75);
          line-height: 1.7; margin-bottom: 16px;
          white-space: pre-wrap; font-size: 14px; font-weight: 300;
        }

        .attachment {
          margin: 14px 0;
          background: rgba(88,28,135,0.2);
          border: 1px solid rgba(168,85,247,0.2);
          border-radius: 10px; padding: 10px;
        }
        .image-attachment { max-width: 100%; height: auto; border-radius: 8px; display: block; }
        .file-link { display: inline-block; padding: 8px; color: #c084fc; font-weight: 500; text-decoration: none; font-size: 13px; }
        .file-link:hover { color: #d8b4fe; text-decoration: underline; }

        .actions {
          display: flex; gap: 8px; flex-wrap: wrap;
          border-top: 1px solid rgba(168,85,247,0.1);
          padding-top: 14px; align-items: center;
        }

        .action-btn {
          padding: 6px 14px; border-radius: 20px;
          border: 1px solid rgba(168,85,247,0.2);
          background: rgba(88,28,135,0.2);
          color: rgba(196,181,253,0.7);
          cursor: pointer; transition: all 0.2s;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; gap: 5px;
        }
        .action-btn:hover {
          background: rgba(168,85,247,0.25);
          border-color: rgba(168,85,247,0.45);
          color: #f3e8ff;
        }
        .action-btn.liked {
          background: rgba(234,88,12,0.18);
          border-color: rgba(251,146,60,0.4);
          color: #fb923c;
        }
        .action-btn.disliked {
          background: rgba(29,78,216,0.18);
          border-color: rgba(147,197,253,0.35);
          color: #93c5fd;
        }
        .action-btn.active {
          background: rgba(168,85,247,0.25);
          border-color: rgba(168,85,247,0.5);
          color: #d8b4fe;
        }

        .btn-edit {
          margin-left: auto;
          background: rgba(168,85,247,0.15);
          color: rgba(196,181,253,0.8);
          border: 1px solid rgba(168,85,247,0.25);
          padding: 6px 12px; border-radius: 8px;
          cursor: pointer; font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-edit:hover { background: rgba(168,85,247,0.3); color: #f3e8ff; }

        .btn-delete {
          background: rgba(220,38,38,0.12);
          color: #fca5a5;
          border: 1px solid rgba(220,38,38,0.2);
          padding: 6px 12px; border-radius: 8px;
          cursor: pointer; font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-delete:hover { background: rgba(220,38,38,0.25); }

        /* Comments */
        .comment-section { margin-top: 20px; padding-top: 16px; border-top: 1px dashed rgba(168,85,247,0.2); }

        .comment-form { display: flex; gap: 8px; margin-bottom: 18px; }
        .comment-form input {
          flex: 1; padding: 8px 14px;
          background: rgba(88,28,135,0.2);
          border: 1px solid rgba(168,85,247,0.2);
          border-radius: 8px; outline: none;
          font-size: 13px; color: #f3e8ff;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s;
        }
        .comment-form input::placeholder { color: rgba(196,181,253,0.3); }
        .comment-form input:focus { border-color: rgba(168,85,247,0.5); }
        .comment-form button {
          background: linear-gradient(135deg, #9333ea, #7c3aed);
          color: #fff; border: none;
          padding: 8px 16px; border-radius: 8px;
          cursor: pointer; font-weight: 500;
          font-family: 'DM Sans', sans-serif; font-size: 13px;
          transition: opacity 0.2s;
        }
        .comment-form button:hover { opacity: 0.88; }

        .comment-wrapper { margin-bottom: 14px; }
        .comment-box {
          background: rgba(88,28,135,0.18);
          border: 1px solid rgba(168,85,247,0.15);
          padding: 12px 14px; border-radius: 10px;
        }
        .comment-user {
          font-size: 12px; margin-bottom: 5px;
          display: flex; align-items: center;
          color: rgba(196,181,253,0.9);
        }
        .comment-user strong { font-weight: 500; }
        .comment-text { font-size: 13px; color: rgba(233,213,255,0.75); margin: 0; line-height: 1.5; }
        .comment-actions { display: flex; gap: 12px; margin-top: 8px; }
        .comment-actions button {
          background: none; border: none;
          font-size: 12px; color: rgba(196,181,253,0.45);
          cursor: pointer; padding: 0; font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.2s;
        }
        .comment-actions button:hover { color: #d8b4fe; }
        .del-btn {
          background: none; border: none;
          font-size: 12px; color: rgba(248,113,113,0.6);
          cursor: pointer; padding: 0;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.2s;
        }
        .del-btn:hover { color: #fca5a5; }

        .reply-box {
          margin-left: 22px; margin-top: 8px;
          background: rgba(109,40,217,0.12);
          border-left: 2px solid rgba(168,85,247,0.35);
          padding: 10px 12px; border-radius: 0 8px 8px 0;
        }
        .reply-form {
          margin-left: 22px; margin-top: 8px; margin-bottom: 10px;
          display: flex; gap: 6px;
        }
        .reply-form input {
          flex: 1; font-size: 13px; padding: 6px 10px;
          background: rgba(88,28,135,0.2);
          border: 1px solid rgba(168,85,247,0.2);
          border-radius: 6px; outline: none;
          color: #f3e8ff; font-family: 'DM Sans', sans-serif;
          transition: border-color 0.2s;
        }
        .reply-form input:focus { border-color: rgba(168,85,247,0.5); }
        .btn-post-reply {
          font-size: 12px;
          background: rgba(168,85,247,0.25);
          color: #d8b4fe; border: 1px solid rgba(168,85,247,0.3);
          padding: 6px 12px; border-radius: 6px;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background 0.2s;
        }
        .btn-post-reply:hover { background: rgba(168,85,247,0.4); }

        .empty-text { text-align: center; color: rgba(196,181,253,0.3); font-size: 13px; margin: 20px 0; font-style: italic; }

        /* Edit mode */
        .edit-container { display: flex; flex-direction: column; gap: 12px; }
        .edit-input {
          width: 100%; font-size: 1.1rem; font-weight: 600;
          padding: 10px 14px;
          background: rgba(88,28,135,0.2);
          border: 1px solid rgba(168,85,247,0.25);
          border-radius: 8px; outline: none;
          color: #f3e8ff; font-family: 'Cormorant Garamond', serif;
          box-sizing: border-box; transition: border-color 0.2s;
        }
        .edit-input:focus { border-color: rgba(168,85,247,0.55); }
        .edit-textarea {
          width: 100%; padding: 10px 14px;
          background: rgba(88,28,135,0.2);
          border: 1px solid rgba(168,85,247,0.25);
          border-radius: 8px; outline: none;
          font-family: 'DM Sans', sans-serif;
          color: rgba(233,213,255,0.85);
          line-height: 1.6; resize: vertical;
          box-sizing: border-box; font-size: 14px;
          transition: border-color 0.2s;
        }
        .edit-textarea:focus { border-color: rgba(168,85,247,0.55); }

        .button-group { display: flex; gap: 8px; }
        .btn { padding: 9px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px; transition: opacity 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-save { background: linear-gradient(135deg, #9333ea, #7c3aed); color: white; }
        .btn-save:hover:not(:disabled) { opacity: 0.88; }
        .btn-cancel { background: rgba(88,28,135,0.25); color: rgba(196,181,253,0.7); border: 1px solid rgba(168,85,247,0.2); }
        .btn-cancel:hover { background: rgba(88,28,135,0.4); color: #f3e8ff; }

        .edit-image-section {
          display: flex; flex-direction: column; gap: 8px;
          padding: 14px; border: 1px dashed rgba(168,85,247,0.3);
          border-radius: 10px; background: rgba(88,28,135,0.1);
        }
        .edit-image-label { font-size: 12px; font-weight: 500; color: rgba(196,181,253,0.6); margin: 0; letter-spacing: 0.06em; text-transform: uppercase; }
        .edit-image-preview-wrapper { position: relative; display: inline-block; }
        .edit-image-preview { max-width: 100%; max-height: 220px; border-radius: 8px; display: block; object-fit: cover; }
        .btn-remove-image { margin-top: 6px; display: inline-block; background: rgba(220,38,38,0.2); color: #fca5a5; border: 1px solid rgba(220,38,38,0.25); padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: background 0.2s; }
        .btn-remove-image:hover { background: rgba(220,38,38,0.35); }
        .edit-file-existing { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(196,181,253,0.7); }
        .btn-upload-image { display: inline-block; background: rgba(124,58,237,0.3); color: #d8b4fe; border: 1px solid rgba(168,85,247,0.3); padding: 7px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 500; transition: background 0.2s; font-family: 'DM Sans', sans-serif; }
        .btn-upload-image:hover { background: rgba(124,58,237,0.5); }
      `}</style>
    </div>
  );
}