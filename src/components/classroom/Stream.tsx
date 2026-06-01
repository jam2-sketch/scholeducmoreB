import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, MessageCircle, MoreVertical, Send, User, Sparkles, Wand2, Calendar, Target, Award, Trash2, Search, Filter, BookOpen, AlertCircle, FileText, Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useScholeduc } from '../../ScholeducProvider';
import { Class, Post, Comment } from '../../types';
import { cn, formatDate } from '../../lib/utils';

const INTELLIGENCE_TIPS = [
  {
    title: "Engagement Velocity",
    text: "Your community is most active on Tuesday evenings. Sharing study guides or questions during this window yields 2.4x higher participation.",
    actionText: "Optimize Target"
  },
  {
    title: "Conversational Depth",
    text: "Announcements finishing with open-ended diagnostic questions enjoy 3x more classroom dialogue. Try starting a prompt.",
    actionText: "Draft Dialogue Guide"
  },
  {
    title: "Resource Syncloop",
    text: "Posting supplementary curriculum files directly inside announcements lowers students' obstacle threshold by up to 45%.",
    actionText: "Sync Curriculum Files"
  }
];

export default function Stream({ cls }: { cls: Class }) {
  const { profile, user } = useScholeduc();
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Rotating tips state
  const [tipIndex, setTipIndex] = useState(0);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', cls.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching assignments for sidebar:', error);
      } else {
        setAssignments(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

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
    fetchAssignments();

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('scroll') === 'deadlines') {
      const timer = setTimeout(() => {
        const el = document.getElementById('course-deadlines');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-blue-600/50', 'scale-[1.02]');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-blue-600/50', 'scale-[1.02]');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.search, cls.id]);

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

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery ? true : (
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesTag = !selectedTag ? true : (
      (selectedTag === 'assignment' && post.type === 'assignment') ||
      (selectedTag === 'announcement' && post.type === 'announcement')
    );
    return matchesSearch && matchesTag;
  });

  const presetTemplates = [
    { label: "📢 Weekly update...", template: "Hello team,\n\nHere is our agenda for this week:\n- Standard Modules:\n- Imminent Objectives:\n\nReach out in the commentaries if any obstructions arise." },
    { label: "💡 Discourse topic...", template: "Classroom Dialogue of the Day:\n\nHow do you think this week's seminar applies to real-world industrial systems? Post your reflections below for academic credits!" },
    { label: "📖 Supplemental reading...", template: "Supplementary readings have been hosted. Please check the Curriculum tab and review files by Friday." }
  ];

  return (
    <div className="grid grid-cols-12 gap-6 lg:gap-10">
      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/10 pb-4">
           <div>
              <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">The Course Feed</h2>
              <p className="text-xs font-serif italic text-brand-text/50 mt-1">Dialogue, Announcements, & Academic Updates</p>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={fetchPosts}
                className="text-[10px] uppercase tracking-widest font-black text-blue-600 hover:text-blue-850 px-3 py-1.5 bg-blue-50/50 rounded-lg border border-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                Sync Feed
              </button>
              <div className="w-12 h-px bg-brand-border hidden sm:block" />
           </div>
        </div>

        {/* Elegant Search & Tag Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-brand-text/30 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements, authors..."
              className="w-full bg-white border border-brand-border/60 pl-11 pr-4 py-2.5 rounded-2xl text-xs outline-none focus:border-brand-text/40 transition-all text-brand-text placeholder:text-brand-text/20 font-serif italic"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-brand-text/40 hover:text-brand-text"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-start sm:justify-end">
            <button
              onClick={() => setSelectedTag(null)}
              className={cn(
                "px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all cursor-pointer",
                !selectedTag ? "bg-[#1A1A1A] text-white border-brand-text" : "bg-white text-brand-text/50 border-brand-border hover:text-brand-text"
              )}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTag('announcement')}
              className={cn(
                "px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all cursor-pointer",
                selectedTag === 'announcement' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-brand-text/50 border-brand-border hover:text-blue-600"
              )}
            >
              Dialogues
            </button>
            <button
              onClick={() => setSelectedTag('assignment')}
              className={cn(
                "px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all cursor-pointer",
                selectedTag === 'assignment' ? "bg-orange-600 text-white border-orange-600" : "bg-white text-brand-text/50 border-brand-border hover:text-orange-600"
              )}
            >
              Mandatory
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-serif italic mb-6">
            {error}
          </div>
        )}

        {/* Post Box */}
        <div className="bg-white border border-brand-border p-5 sm:p-8 rounded-3xl group transition-all hover:border-[#1A1A1A]/20 shadow-sm relative overflow-hidden">
          {!isPosting ? (
            <button 
              onClick={() => setIsPosting(true)}
              className="w-full flex items-center gap-4 sm:gap-6 text-left focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full border border-brand-border flex items-center justify-center bg-brand-bg shrink-0">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all" alt="Me" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-[#1A1A1A] text-white flex items-center justify-center text-sm font-serif italic">
                    {profile?.display_name?.charAt(0).toUpperCase() || 'M'}
                  </div>
                )}
              </div>
              <p className="text-base sm:text-lg font-serif italic text-brand-text/30 group-hover:text-brand-text/50 transition-colors break-words flex-1">Share an update, agenda or inquiry with your class...</p>
            </button>
          ) : (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-brand-text/30" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-text/40">Compose Broadcast</span>
              </div>
              
              <textarea
                autoFocus
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Compose your message..."
                className="w-full min-h-[140px] bg-brand-bg rounded-2xl p-5 text-brand-text border border-brand-border focus:outline-none focus:border-brand-text transition-all font-serif italic text-base leading-relaxed placeholder:text-brand-text/20"
              />

              {/* Prest templates for Teachers */}
              {profile?.role === 'teacher' && (
                <div className="space-y-2">
                  <span className="block text-[8px] font-black uppercase text-brand-text/40 tracking-[0.2em]">Academic Preset Snippets:</span>
                  <div className="flex flex-wrap gap-2">
                    {presetTemplates.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewPostContent(item.template)}
                        className="text-[9px] font-bold text-brand-text/60 bg-brand-bg hover:bg-brand-text hover:text-white px-3 py-1.5 rounded-full border border-brand-border transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-brand-border/10">
                 <button onClick={() => { setIsPosting(false); setNewPostContent(''); }} className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 hover:text-brand-text cursor-pointer">Discard</button>
                 <button 
                    onClick={handlePost}
                    disabled={!newPostContent.trim()}
                    className="bg-[#1A1A1A] hover:bg-black text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-text/15 disabled:opacity-35 transition-all transform active:scale-95 cursor-pointer"
                 >
                   Broadcast Post
                 </button>
              </div>
            </motion.div>
          )}
        </div>

        <section className="space-y-10">
          <AnimatePresence>
            {filteredPosts.length === 0 ? (
              <div className="p-16 border border-brand-border rounded-[2.5rem] bg-white text-center">
                <BookOpen className="w-8 h-8 mx-auto text-brand-text/25 mb-4" />
                <h3 className="text-xl font-serif italic text-brand-text/50">The intellectual feed is silent</h3>
                <p className="text-xs text-brand-text/30 max-w-sm mx-auto mt-2">Try adjusting your filters or search tags to uncover previous announcements.</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} classId={cls.id} />
              ))
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Right Sidebar */}
      <aside className="col-span-12 lg:col-span-4 space-y-12">
        {/* Dynamic AI Insight Box */}
        <div className="bg-blue-50/50 border border-blue-200 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300 opacity-20 blur-3xl group-hover:opacity-35 transition-opacity" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-800">Scholeduc Intelligence</h3>
            </div>
            <button 
              onClick={() => setTipIndex((prev) => (prev + 1) % INTELLIGENCE_TIPS.length)}
              className="text-[9px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-900 cursor-pointer"
            >
              Next tip
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <span className="inline-block bg-blue-100 text-blue-800 text-[8px] font-black px-2.5 py-0.5 rounded uppercase tracking-widest">
                {INTELLIGENCE_TIPS[tipIndex].title}
              </span>
              <p className="text-sm italic font-serif leading-relaxed text-blue-950/80">
                "{INTELLIGENCE_TIPS[tipIndex].text}"
              </p>
              <button 
                onClick={() => {
                  alert("Intelligence algorithm synchronized! Our telemetry shows current performance stats mapped correctly.");
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                {INTELLIGENCE_TIPS[tipIndex].actionText}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mini Tasks */}
        <div id="course-deadlines" className="scroll-mt-24 transition-all duration-700 rounded-3xl p-1">
           <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 mb-6 flex items-center gap-4">
             Course Deadlines
             <div className="flex-1 h-px bg-brand-border" />
           </h3>
           <div className="space-y-4">
             {assignments.filter(a => a.due_date).length === 0 ? (
                <div className="flex gap-4 items-start opacity-40 italic font-serif text-sm pl-2">
                   No imminent obstacles in the current orbit.
                </div>
             ) : (
                assignments.filter(a => a.due_date).slice(0, 4).map((a) => {
                  const isPassed = new Date(a.due_date) < new Date();
                  return (
                    <div key={a.id} className="p-4 bg-white rounded-2xl border border-brand-border space-y-2.5 shadow-sm">
                      <span className="block text-xs font-bold text-brand-text truncate uppercase tracking-tight">{a.title}</span>
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isPassed ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-orange-100 text-orange-950 border border-orange-200'
                        }`}>
                          <Target className="w-3 h-3 text-orange-700" />
                          <span>{isPassed ? 'Overdue' : 'Due'}: {formatDate(a.due_date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-950 border border-blue-200">
                          <Award className="w-3 h-3 text-blue-700" />
                          <span>{a.points} Pts</span>
                        </div>
                      </div>
                    </div>
                  );
                })
             )}
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
  const [showOptions, setShowOptions] = useState(false);

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

  useEffect(() => {
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you certain you wish to purge this broadcast? This cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert("Error deleting post: " + err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Remove this comment from the classroom dialogue?")) return;
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
    }
  };

  const isAssignment = post.type === 'assignment';
  const canDeletePost = user?.id === post.author_id || profile?.role === 'teacher';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white p-5 sm:p-8 rounded-3xl border transition-all relative ${isAssignment ? 'border-2 border-brand-text' : 'border-brand-border shadow-sm'}`}
    >
      <header className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-brand-border flex items-center justify-center overflow-hidden shrink-0">
            {post.author_photo ? (
              <img src={post.author_photo} className="w-full h-full object-cover grayscale" alt={post.author_name} referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-serif italic">
                {post.author_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
               {isAssignment && <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Mandatory Task</span>}
               <h4 className="text-sm font-bold text-brand-text uppercase tracking-widest">{post.author_name}</h4>
            </div>
            <p className="text-[10px] opacity-40 uppercase tracking-tighter mt-0.5">{formatDate(post.created_at)}</p>
          </div>
        </div>
        
        {canDeletePost && (
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="text-brand-text opacity-25 hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-brand-bg cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-1 bg-white border border-brand-border rounded-xl shadow-lg py-1.5 z-10 w-32">
                <button
                  onClick={() => { setShowOptions(false); handleDeletePost(); }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-650 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Purge Post
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="mb-8">
        <p className={`text-brand-text leading-relaxed font-serif italic whitespace-pre-wrap ${isAssignment ? 'text-2xl font-bold mb-4' : 'text-lg opacity-70'}`}>
          {post.content}
        </p>
        
        {isAssignment && (
          <div className="bg-brand-bg rounded-2xl border border-dashed border-brand-border p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div className="min-w-0 flex-1 max-w-full">
                <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-1">Associated Module</p>
                <p className="text-sm font-bold underline decoration-brand-text/10 underline-offset-4 cursor-pointer hover:text-blue-600 transition-all break-all sm:break-normal">Curriculum_Standards_v2.pdf</p>
             </div>
             <button className="px-6 py-2 bg-brand-text text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg shadow-brand-text/10 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer">Launch Draft</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 pt-6 border-t border-brand-border">
        <button 
          onClick={() => setIsCommenting(!isCommenting)}
          className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-brand-text/50 hover:text-brand-text transition-colors cursor-pointer"
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
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {comments.map((comment) => {
                const canDeleteComment = user?.id === comment.author_id || profile?.role === 'teacher';
                return (
                  <div key={comment.id} className="flex gap-4 items-start justify-between group/comment">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full border border-brand-border shrink-0 overflow-hidden flex items-center justify-center bg-brand-bg text-[10px] font-bold text-brand-text">
                        {comment.author_photo ? (
                          <img src={comment.author_photo} className="w-full h-full object-cover grayscale" alt={comment.author_name} referrerPolicy="no-referrer" />
                        ) : (
                          comment.author_name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-brand-text/75">
                          {comment.author_name} 
                          <span className="opacity-30 font-normal ml-2">{formatDate(comment.created_at)}</span>
                        </p>
                        <p className="text-sm italic font-serif text-brand-text leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                    {canDeleteComment && (
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-0 group-hover/comment:opacity-100 p-1 text-red-650/45 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 items-center pt-2 border-t border-brand-border/10">
              <input 
                type="text" 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Participate in dialogue..."
                className="flex-1 bg-brand-bg rounded-xl border border-brand-border px-4 py-2.5 text-xs font-serif italic outline-none focus:border-brand-text transition-all"
              />
              <button 
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="p-2 text-brand-text hover:text-blue-600 disabled:opacity-20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
