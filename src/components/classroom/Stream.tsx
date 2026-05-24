import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, MessageCircle, MoreVertical, Send, User, Sparkles, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useScholeduc } from '../../ScholeducProvider';
import { Class, Post, Comment } from '../../types';
import { cn, formatDate } from '../../lib/utils';

export default function Stream({ cls }: { cls: Class }) {
  const { profile, user } = useScholeduc();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('class_id', cls.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch posts error:', error);
        setError(`Failed to fetch posts: ${error.message}`);
      } else {
        setPosts(data as Post[] || []);
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error fetching posts');
    }
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel(`stream-${cls.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `class_id=eq.${cls.id}` },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cls.id]);

  const handlePost = async () => {
    if (!profile || !user || !newPostContent.trim()) return;

    setError(null);
    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          class_id: cls.id,
          author_id: user.id,
          author_name: profile.display_name,
          author_photo: profile.photo_url,
          content: newPostContent,
          type: 'announcement',
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;
      setNewPostContent('');
      setIsPosting(false);
      fetchPosts(); // Manual trigger
    } catch (err: any) {
      console.error('Post creation error:', err);
      setError(err.message || 'Failed to publish post. Check database permissions.');
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 lg:gap-10">
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">The Stream</h2>
           <div className="flex items-center gap-4">
              <button 
                onClick={fetchPosts}
                className="text-[10px] uppercase tracking-widest font-bold text-blue-600 hover:opacity-50 transition-all"
              >
                Sync Feed
              </button>
              <div className="w-24 h-px bg-brand-border" />
           </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-serif italic mb-6">
            {error}
          </div>
        )}

        {/* Post Box */}
        <div className="bg-white border border-brand-border p-5 sm:p-8 rounded-3xl group transition-all hover:border-[#1A1A1A]/20">
          {!isPosting ? (
            <button 
              onClick={() => setIsPosting(true)}
              className="w-full flex items-center gap-4 sm:gap-6 text-left"
            >
              <div className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center bg-brand-bg shrink-0">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all" alt="Me" referrerPolicy="no-referrer" />
                ) : <User className="w-6 h-6 text-brand-text/20" />}
              </div>
              <p className="text-lg sm:text-xl font-serif text-brand-text/30 group-hover:text-brand-text/50 transition-colors break-words flex-1">Shared an announcement with your audience...</p>
            </button>
          ) : (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-6"
            >
              <textarea
                autoFocus
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Compose your message..."
                className="w-full min-h-[150px] bg-brand-bg rounded-xl p-6 text-brand-text border border-brand-border focus:outline-none focus:border-brand-text transition-all font-serif text-lg leading-relaxed placeholder:text-brand-text/20"
              />
              <div className="flex justify-end gap-4">
                 <button onClick={() => setIsPosting(false)} className="text-[10px] font-bold uppercase tracking-widest text-brand-text/30 hover:text-brand-text/60">Cancel</button>
                 <button 
                    onClick={handlePost}
                    disabled={!newPostContent.trim()}
                    className="bg-brand-text text-white px-8 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-brand-text/10 disabled:opacity-30"
                 >
                   Broadcast Post
                 </button>
              </div>
            </motion.div>
          )}
        </div>

        <section className="space-y-10">
          <AnimatePresence>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} classId={cls.id} />
            ))}
          </AnimatePresence>
        </section>
      </div>

      {/* Right Sidebar */}
      <aside className="col-span-12 lg:col-span-4 space-y-12">
        {/* AI Insight Box */}
        <div className="bg-[#F1F5F9] border border-blue-200 p-5 sm:p-8 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 opacity-5 blur-3xl group-hover:opacity-10 transition-opacity" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-800">Scholeduc Intelligence</h3>
          </div>
          <p className="text-base italic font-serif leading-relaxed text-blue-900/80 mb-6">
            "Your students are most active on Tuesday evenings. Consider scheduling your major assignments then for maximum impact."
          </p>
          <button className="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all">
            Optimize Schedule
          </button>
        </div>

        {/* Mini Tasks */}
        <div>
           <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 mb-6 flex items-center gap-4">
             Course Deadlines
             <div className="flex-1 h-px bg-brand-border" />
           </h3>
           <div className="space-y-6">
             <div className="flex gap-6 items-start opacity-40 italic font-serif text-sm">
                No imminent obstacles in the current orbit.
             </div>
           </div>
        </div>

        {/* Stats */}
        <div className="pt-10 border-t border-brand-border">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 mb-6">Class Atmosphere</h3>
          <div className="flex items-end gap-1.5 h-12 mb-6">
            {[30, 50, 80, 45, 90, 60].map((h, i) => (
              <div key={i} className={`flex-1 ${i === 4 ? 'bg-blue-600' : 'bg-blue-100'} rounded-sm`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-2xl font-serif italic text-brand-text">88%</p>
              <p className="text-[9px] uppercase tracking-tighter opacity-40 font-bold">Engagement</p>
            </div>
            <div>
              <p className="text-2xl font-serif italic text-brand-text">+3.1</p>
              <p className="text-[9px] uppercase tracking-tighter opacity-40 font-bold">Velocity</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

interface PostCardProps {
  post: Post;
  classId: string;
  key?: any;
}

function PostCard({ post, classId }: PostCardProps) {
  const { profile, user } = useScholeduc();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_id', post.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setComments(data as Comment[]);
      }
    };

    fetchComments();

    const channel = supabase
      .channel(`comments-${post.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `parent_id=eq.${post.id}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id]);

  const handleComment = async () => {
    if (!profile || !user || !commentText.trim()) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          parent_id: post.id,
          author_id: user.id,
          author_name: profile.display_name,
          author_photo: profile.photo_url,
          content: commentText,
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;
      setCommentText('');
      setIsCommenting(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isAssignment = post.type === 'assignment';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white p-5 sm:p-8 rounded-3xl border transition-all ${isAssignment ? 'border-2 border-brand-text' : 'border-brand-border shadow-sm'}`}
    >
      <header className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-brand-border flex items-center justify-center overflow-hidden shrink-0">
            {post.author_photo ? (
              <img src={post.author_photo} className="w-full h-full object-cover grayscale" alt={post.author_name} referrerPolicy="no-referrer" />
            ) : <User className="w-5 h-5 text-brand-text/10" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
               {isAssignment && <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Mandatory Task</span>}
               <h4 className="text-sm font-bold text-brand-text uppercase tracking-widest">{post.author_name}</h4>
            </div>
            <p className="text-[10px] opacity-40 uppercase tracking-tighter mt-0.5">{formatDate(post.created_at)}</p>
          </div>
        </div>
        <button className="text-brand-text opacity-20 hover:opacity-100 transition-opacity"><MoreVertical className="w-5 h-5" /></button>
      </header>

      <div className="mb-8">
        <p className={`text-brand-text leading-relaxed font-serif italic ${isAssignment ? 'text-2xl font-bold mb-4' : 'text-lg opacity-70'}`}>
          {post.content}
        </p>
        
        {isAssignment && (
          <div className="bg-brand-bg rounded-2xl border border-dashed border-brand-border p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div className="min-w-0 flex-1 max-w-full">
                <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-1">Associated Module</p>
                <p className="text-sm font-bold underline decoration-brand-text/10 underline-offset-4 cursor-pointer hover:text-blue-600 transition-all break-all sm:break-normal">Curriculum_Standards_v2.pdf</p>
             </div>
             <button className="px-6 py-2 bg-brand-text text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg shadow-brand-text/10 whitespace-nowrap shrink-0 self-start sm:self-auto">Launch Draft</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 pt-6 border-t border-brand-border">
        <button 
          onClick={() => setIsCommenting(!isCommenting)}
          className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-brand-text/40 hover:text-brand-text transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length} Classroom Dialogues
        </button>
      </div>

      <AnimatePresence>
        {isCommenting && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-6 pt-6 border-t border-brand-border space-y-6 overflow-hidden"
          >
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div className="w-8 h-8 rounded-full border border-brand-border shrink-0 grayscale" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1">{comment.author_name} <span className="opacity-30 font-normal ml-2">{formatDate(comment.created_at)}</span></p>
                  <p className="text-sm italic font-serif opacity-70 leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-4 items-center">
              <input 
                type="text" 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Participate in conversation..."
                className="flex-1 bg-brand-bg rounded-lg border border-brand-border px-4 py-2 text-xs font-serif italic outline-none focus:border-brand-text transition-all"
              />
              <button 
                onClick={handleComment}
                className="p-2 text-brand-text opacity-40 hover:opacity-100 transition-opacity"
              ><Send className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
