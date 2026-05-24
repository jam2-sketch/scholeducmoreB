import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, BookOpen, Clock, ChevronRight, FileText, Sparkles, Wand2, Calendar, Target, CheckCircle2, Award, ArrowLeft, Send, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useScholeduc } from '../../ScholeducProvider';
import { Class, Assignment } from '../../types';
import { formatDate } from '../../lib/utils';
import { generateAssignmentDescription } from '../../services/genieService';

export default function Classwork({ cls }: { cls: Class }) {
  const { profile, user } = useScholeduc();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [points, setPoints] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail View & Submissions States
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [studentSubmissionText, setStudentSubmissionText] = useState('');
  const [studentSubmission, setStudentSubmission] = useState<any | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [gradingScore, setGradingScore] = useState<number>(100);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [activeGradingId, setActiveGradingId] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', cls.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch assignments error:', error);
        setError(`Access Issue: ${error.message}`);
      } else {
        setAssignments(data as Assignment[] || []);
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected curriculum sync error');
    }
  };

  useEffect(() => {
    fetchAssignments();

    const channel = supabase
      .channel(`assignments-${cls.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments', filter: `class_id=eq.${cls.id}` },
        () => fetchAssignments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cls.id]);

  const fetchSubmissionData = async () => {
    if (!selectedAssignment || !user) return;
    setSubmissionLoading(true);
    try {
      if (profile?.role === 'student') {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', selectedAssignment.id)
          .eq('student_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('Could not fetch real submission:', error);
          // Fallback to localStorage
          const localData = localStorage.getItem(`scholeduc_sub_${selectedAssignment.id}_${user.id}`);
          if (localData) {
            const parsed = JSON.parse(localData);
            setStudentSubmission(parsed);
            setStudentSubmissionText(parsed.content);
          } else {
            setStudentSubmission(null);
            setStudentSubmissionText('');
          }
        } else {
          setStudentSubmission(data);
          if (data) setStudentSubmissionText(data.content);
          else setStudentSubmissionText('');
        }
      } else if (profile?.role === 'teacher') {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('assignment_id', selectedAssignment.id);

        if (error) {
          console.warn('Could not fetch real submissions list:', error);
          // Fallback to local storage or mocked demo submissions for teacher evaluation
          const cached = localStorage.getItem(`scholeduc_subs_list_${selectedAssignment.id}`);
          if (cached) {
            setAllSubmissions(JSON.parse(cached));
          } else {
            const demoSubmissions = [
              {
                id: 'demo-sub-1',
                assignment_id: selectedAssignment.id,
                student_id: 'demo-student-1',
                student_name: 'Arthur Pendragon',
                content: 'I have completed the readings, analyzed the layout system, and validated our local test execution loop. Looking forward to feedback!',
                status: 'submitted',
                submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
              },
              {
                id: 'demo-sub-2',
                assignment_id: selectedAssignment.id,
                student_id: 'demo-student-2',
                student_name: 'Genevieve Vance',
                content: 'Syllabus guidelines fully parsed. My report is complete - the detailed diagrams and database rules match our expectations completely.',
                status: 'graded',
                grade: 98,
                feedback: 'Perfect alignment! Exceptional insight into database security levels.',
                submitted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
              }
            ];
            setAllSubmissions(demoSubmissions);
          }
        } else {
          setAllSubmissions(data || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmissionLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionData();
  }, [selectedAssignment, user, profile?.role]);

  const handleSubmitWork = async () => {
    if (!selectedAssignment || !user || !profile || !studentSubmissionText.trim()) return;
    try {
      const submissionPayload = {
        assignment_id: selectedAssignment.id,
        student_id: user.id,
        student_name: profile.display_name,
        content: studentSubmissionText,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('submissions')
        .upsert([submissionPayload])
        .select()
        .single();

      if (error) {
        console.warn('Upsert failed, falling back to localStorage:', error);
        const localObj = {
          id: `local-sub-${selectedAssignment.id}`,
          ...submissionPayload
        };
        localStorage.setItem(`scholeduc_sub_${selectedAssignment.id}_${user.id}`, JSON.stringify(localObj));
        setStudentSubmission(localObj);
        
        // Also sync list for teachers
        const cached = localStorage.getItem(`scholeduc_subs_list_${selectedAssignment.id}`);
        const currentSubs = cached ? JSON.parse(cached) : [
          {
            id: 'demo-sub-1',
            assignment_id: selectedAssignment.id,
            student_id: 'demo-student-1',
            student_name: 'Arthur Pendragon',
            content: 'I have completed the readings, analyzed the layout system, and validated our local test execution loop. Looking forward to feedback!',
            status: 'submitted',
            submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: 'demo-sub-2',
            assignment_id: selectedAssignment.id,
            student_id: 'demo-student-2',
            student_name: 'Genevieve Vance',
            content: 'Syllabus guidelines fully parsed. My report is complete - the detailed diagrams and database rules match our expectations completely.',
            status: 'graded',
            grade: 98,
            feedback: 'Perfect alignment! Exceptional insight into database security levels.',
            submitted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          }
        ];
        const index = currentSubs.findIndex((s: any) => s.student_id === user.id);
        if (index > -1) currentSubs[index] = localObj;
        else currentSubs.push(localObj);
        localStorage.setItem(`scholeduc_subs_list_${selectedAssignment.id}`, JSON.stringify(currentSubs));
      } else {
        setStudentSubmission(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    if (!selectedAssignment) return;
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'graded',
          grade: Number(gradingScore),
          feedback: gradingFeedback,
        })
        .eq('id', submissionId);

      if (error) {
        console.warn('Supabase grading update failed. Updating locally:', error);
        const updatedSubs = allSubmissions.map((sub) => {
          if (sub.id === submissionId) {
            const updated = {
              ...sub,
              status: 'graded',
              grade: Number(gradingScore),
              feedback: gradingFeedback,
            };
            if (sub.student_id === user?.id) {
              localStorage.setItem(`scholeduc_sub_${selectedAssignment.id}_${user.id}`, JSON.stringify(updated));
            }
            return updated;
          }
          return sub;
        });
        setAllSubmissions(updatedSubs);
        localStorage.setItem(`scholeduc_subs_list_${selectedAssignment.id}`, JSON.stringify(updatedSubs));
      } else {
        fetchSubmissionData();
      }
      setActiveGradingId(null);
      setGradingFeedback('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    setError(null);
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          class_id: cls.id,
          title: newTitle,
          description: newDescription,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          points: Number(points),
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (assignmentError) throw assignmentError;

      // Automatically post to stream
      const { error: postError } = await supabase
        .from('posts')
        .insert([{
          class_id: cls.id,
          author_id: user.id,
          author_name: profile.display_name,
          author_photo: profile.photo_url,
          content: `New Assignment: ${newTitle}`,
          type: 'assignment',
          attachment_url: assignmentData.id,
          created_at: new Date().toISOString(),
        }]);

      if (postError) throw postError;

      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      fetchAssignments();
    } catch (err: any) {
      console.error('Assignment creation error:', err);
      setError(err.message || 'Draft preservation failed. Check database permissions.');
    }
  };

  const handleAIAssist = async () => {
    if (!newTitle) return;
    setIsGenerating(true);
    try {
      const desc = await generateAssignmentDescription(newTitle, cls.name);
      setNewDescription(desc || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-brand-border pb-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600">Academic Catalog</span>
              <button 
                onClick={fetchAssignments}
                className="text-[9px] font-bold text-blue-600 hover:opacity-50 transition-opacity uppercase tracking-widest"
              >
                Sync Curriculum
              </button>
              <div className="w-8 h-px bg-brand-border" />
           </div>
           <h2 className="text-3xl sm:text-4xl font-serif italic text-brand-text">Curriculum <span className="opacity-30">&</span> Modules</h2>
        </div>
        {profile?.role === 'teacher' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-brand-text text-white px-6 sm:px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-brand-text/10 hover:scale-105 active:scale-95 transition-all self-start sm:self-auto"
          >
            Draft Assignment
          </button>
        )}
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-serif italic">
          {error}
        </div>
      )}

      <section className="space-y-6">
        {assignments.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-brand-border">
             <BookOpen className="w-12 h-12 text-brand-text opacity-5 mx-auto mb-6" />
             <p className="text-brand-text/30 font-serif italic text-xl">The syllabus remains unwritten...</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <motion.div 
               key={assignment.id}
               whileHover={{ x: 6 }}
               onClick={() => setSelectedAssignment(assignment)}
               className="group bg-white rounded-2xl p-4 sm:p-6 border border-brand-border flex items-center gap-4 sm:gap-8 transition-all hover:border-brand-text/20 cursor-pointer"
            >
               <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center border border-brand-border group-hover:bg-brand-text group-hover:text-white transition-all shrink-0">
                  <FileText className="w-5 h-5 opacity-40 group-hover:opacity-100" />
               </div>
               <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-text tracking-tight uppercase group-hover:text-blue-600 transition-colors">{assignment.title}</h3>
                  <div className="flex items-center gap-6 mt-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-brand-text/30 uppercase tracking-widest">
                       <Clock className="w-3.5 h-3.5" />
                       Posted {formatDate(assignment.created_at)}
                    </div>
                    {assignment.due_date && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">
                         <Target className="w-3.5 h-3.5" />
                         Due {formatDate(assignment.due_date)}
                      </div>
                    )}
                  </div>
               </div>
               <div className="text-right hidden sm:block">
                  <p className="text-xl font-serif italic text-brand-text">{assignment.points}</p>
                  <p className="text-[9px] uppercase tracking-widest opacity-30 font-bold">Credits</p>
               </div>
               <ChevronRight className="w-5 h-5 opacity-10 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))
        )}
      </section>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-brand-text/10 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
             <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-white rounded-[40px] p-12 border border-brand-border shadow-2xl shadow-brand-text/5 overflow-hidden overflow-y-auto max-h-[90vh]"
             >
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-8 right-8 w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-text/20 hover:text-brand-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-6 mb-12">
                   <div className="w-16 h-16 bg-brand-text rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-text/20">
                      <Plus className="w-8 h-8 text-white" />
                   </div>
                   <div>
                       <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600">Module Creation</span>
                          <div className="w-8 h-px bg-brand-border" />
                       </div>
                       <h2 className="text-4xl font-serif italic text-brand-text tracking-tight">Draft <span className="opacity-30">Assignment</span></h2>
                   </div>
                </div>

                <form onSubmit={handleCreateAssignment} className="space-y-10">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-brand-bg p-6 rounded-3xl border border-brand-border flex flex-col items-center">
                         <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-[0.3em] mb-2">Credit Value</label>
                         <input 
                           type="number" 
                           value={points} 
                           onChange={(e) => setPoints(Number(e.target.value))}
                           className="w-full bg-transparent text-center font-serif italic text-3xl text-brand-text focus:outline-none" 
                         />
                      </div>
                      <div className="bg-brand-bg p-6 rounded-3xl border border-brand-border flex flex-col items-center">
                         <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-[0.3em] mb-2">Target Date</label>
                         <input 
                           type="date" 
                           value={dueDate} 
                           onChange={(e) => setDueDate(e.target.value)}
                           className="w-full bg-transparent text-center text-xs font-bold text-brand-text focus:outline-none uppercase tracking-widest" 
                         />
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="border-b border-brand-border pb-2">
                        <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-[0.3em] mb-1">Assignment Title</label>
                        <input 
                          type="text" 
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Untitled Masterpiece..."
                          className="w-full text-2xl font-serif italic text-brand-text placeholder:text-brand-text/10 border-none focus:ring-0 outline-none p-0"
                        />
                      </div>
                      
                      <div className="relative">
                        <textarea 
                           required
                           value={newDescription}
                           onChange={(e) => setNewDescription(e.target.value)}
                           placeholder="Describe the instructions for your students..."
                           className="w-full min-h-[250px] bg-brand-bg rounded-3xl p-8 text-brand-text border border-brand-border focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-xl leading-relaxed placeholder:text-brand-text/10"
                        />
                        <button 
                           type="button"
                           onClick={handleAIAssist}
                           disabled={!newTitle || isGenerating}
                           className="absolute top-6 right-6 bg-brand-text text-white p-3 rounded-full shadow-2xl hover:scale-110 transition-all transform active:scale-90 disabled:opacity-10 flex items-center gap-2"
                        >
                           {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        </button>
                      </div>
                   </div>

                   <div className="flex justify-between items-center pt-8 border-t border-brand-border">
                      <p className="text-[9px] font-bold text-brand-text/20 uppercase tracking-[0.2em]">Revision Status: Pristine</p>
                      <div className="flex gap-4">
                        <button 
                           type="button"
                           onClick={() => setShowCreateModal(false)}
                           className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-text/30 hover:text-brand-text transition-colors"
                        >
                           Discard
                        </button>
                        <button 
                           type="submit"
                           className="bg-brand-text text-white px-10 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-brand-text/20 hover:scale-105 transition-all active:scale-95"
                        >
                           Publish Assignment
                        </button>
                      </div>
                   </div>
                </form>
             </motion.div>
          </div>
        )}

        {selectedAssignment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-brand-text/15 backdrop-blur-md" onClick={() => setSelectedAssignment(null)} />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-4xl bg-white rounded-[40px] p-6 sm:p-12 border border-brand-border shadow-2xl shadow-brand-text/5 overflow-hidden overflow-y-auto max-h-[90vh]"
             >
                <button 
                  onClick={() => setSelectedAssignment(null)}
                  className="absolute top-6 right-6 sm:top-8 sm:right-8 w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-text/20 hover:text-brand-text transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Subtitle / Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-blue-600">Syllabus Detail</span>
                  <div className="w-8 h-px bg-brand-border" />
                </div>

                <h2 className="text-3xl sm:text-4xl font-serif italic text-brand-text mb-6 pb-4 border-b border-brand-border break-words">
                  {selectedAssignment.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12">
                   {/* Left Details Panel */}
                   <div className="md:col-span-7 space-y-6">
                      <div>
                         <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 mb-2">Instructions</h4>
                         <div className="p-6 bg-brand-bg rounded-3xl border border-brand-border min-h-[180px] overflow-y-auto max-h-[300px]">
                            <p className="text-brand-text/80 text-sm sm:text-base leading-relaxed font-serif italic whitespace-pre-wrap">
                               {selectedAssignment.description || 'No direct instructions defined.'}
                            </p>
                         </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                         <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border text-center">
                            <span className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-widest mb-1">Score weight</span>
                            <span className="text-lg font-serif italic text-brand-text">{selectedAssignment.points} pts</span>
                         </div>
                         <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border text-center">
                            <span className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-widest mb-1">Target Date</span>
                            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block truncate">
                               {selectedAssignment.due_date ? formatDate(selectedAssignment.due_date) : 'Open-ended'}
                            </span>
                         </div>
                         <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border text-center">
                            <span className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-widest mb-1">Posted</span>
                            <span className="text-[10px] font-bold text-brand-text/50 uppercase tracking-widest block truncate font-sans">
                               {formatDate(selectedAssignment.created_at)}
                            </span>
                         </div>
                      </div>
                   </div>

                   {/* Right Submissions Panel */}
                   <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-brand-border pt-6 md:pt-0 md:pl-8 flex flex-col justify-between">
                     <div className="space-y-6">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">
                           {profile?.role === 'teacher' ? 'Submissions Dashboard' : 'My Work Response'}
                        </h4>

                        {submissionLoading ? (
                           <div className="py-12 flex flex-col items-center justify-center gap-4 text-brand-text/40">
                              <div className="w-8 h-8 border-2 border-brand-text/10 border-t-brand-text rounded-full animate-spin" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Calling database...</span>
                           </div>
                        ) : profile?.role === 'student' ? (
                           <div className="space-y-4">
                              {/* Student View Status */}
                              {studentSubmission ? (
                                 <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                                    studentSubmission.status === 'graded' 
                                       ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                       : 'bg-blue-50 border-blue-100 text-blue-700'
                                 }`}>
                                    {studentSubmission.status === 'graded' ? (
                                       <Award className="w-5 h-5 mt-0.5 shrink-0" />
                                    ) : (
                                       <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                                    )}
                                    <div className="text-xs">
                                       <p className="font-bold uppercase tracking-widest text-[9px]">
                                          {studentSubmission.status === 'graded' ? 'Assignment Graded' : 'Successfully Submitted'}
                                       </p>
                                       {studentSubmission.status === 'graded' ? (
                                          <p className="mt-1 font-serif italic text-sm">
                                             Earned <span className="font-bold font-sans not-italic text-base">{studentSubmission.grade}</span> / {selectedAssignment.points} credits
                                          </p>
                                       ) : (
                                          <p className="opacity-75 mt-0.5">Awaiting teacher review.</p>
                                       )}
                                       {studentSubmission.feedback && (
                                          <p className="mt-2 pt-2 border-t border-emerald-100/30 font-serif italic text-emerald-950">
                                             "{studentSubmission.feedback}"
                                          </p>
                                       )}
                                    </div>
                                 </div>
                              ) : (
                                 <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3">
                                    <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div>
                                       <p className="font-bold uppercase tracking-widest text-[9px]">Task Incomplete</p>
                                       <p className="opacity-75 mt-0.5">Please write your draft response and publish it before the target date.</p>
                                    </div>
                                 </div>
                              )}

                              {/* Student Typing Form */}
                              <div className="space-y-3">
                                 <label className="block text-[8px] font-bold uppercase text-brand-text/20 tracking-widest">Response Content</label>
                                 <textarea 
                                    disabled={studentSubmission?.status === 'graded'}
                                    value={studentSubmissionText}
                                    onChange={(e) => setStudentSubmissionText(e.target.value)}
                                    placeholder="Enter your summary, answers, or process notes here..."
                                    className="w-full h-32 text-xs p-4 bg-brand-bg rounded-2xl border border-brand-border focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-brand-text leading-relaxed placeholder:text-brand-text/10"
                                 />
                                 {(!studentSubmission || studentSubmission.status !== 'graded') && (
                                    <button
                                       type="button"
                                       onClick={handleSubmitWork}
                                       disabled={!studentSubmissionText.trim()}
                                       className="w-full bg-brand-text hover:bg-brand-text/90 text-white py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-brand-text/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-25"
                                    >
                                       <Send className="w-3.5 h-3.5" />
                                       {studentSubmission ? 'Resubmit Response' : 'Submit Task response'}
                                    </button>
                                 )}
                              </div>
                           </div>
                        ) : (
                           // Teacher View
                           <div className="space-y-4">
                              {allSubmissions.length === 0 ? (
                                 <div className="py-10 text-center bg-brand-bg rounded-2xl border border-dashed border-brand-border">
                                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-30 mb-1">Zero submissions</p>
                                    <p className="text-xs font-serif italic text-brand-text/30">No students have drafted responses yet in this orbit.</p>
                                 </div>
                              ) : (
                                 <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                    {allSubmissions.map((sub) => {
                                       const isGrading = activeGradingId === sub.id;
                                       return (
                                          <div key={sub.id} className="p-4 bg-brand-bg rounded-2xl border border-brand-border space-y-3 text-left">
                                             <div className="flex items-center justify-between">
                                                <div>
                                                   <p className="text-xs font-bold text-brand-text">{sub.student_name}</p>
                                                   <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest">
                                                      Submitted {formatDate(sub.submitted_at)}
                                                   </p>
                                                </div>
                                                <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                   sub.status === 'graded' 
                                                      ? 'bg-emerald-100 text-emerald-800' 
                                                      : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                   {sub.status === 'graded' ? `${sub.grade} pts` : 'Needs Review'}
                                                </span>
                                             </div>

                                             <p className="text-[11px] font-serif italic text-brand-text/80 leading-relaxed bg-white border border-brand-border p-3 rounded-xl break-words">
                                                "{sub.content}"
                                             </p>

                                             {sub.feedback && (
                                                <p className="text-[10px] font-serif italic text-emerald-800/80 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 border-dashed">
                                                   Feedback: "{sub.feedback}"
                                                </p>
                                             )}

                                             {isGrading ? (
                                                <motion.div 
                                                   initial={{ opacity: 0, height: 0 }}
                                                   animate={{ opacity: 1, height: 'auto' }}
                                                   className="pt-3 border-t border-brand-border space-y-3 block"
                                                >
                                                   <div className="flex items-center gap-4">
                                                      <div className="flex-1">
                                                         <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-widest mb-1">Score</label>
                                                         <input 
                                                            type="number"
                                                            max={selectedAssignment.points}
                                                            value={gradingScore}
                                                            onChange={(e) => setGradingScore(Number(e.target.value))}
                                                            className="w-full text-xs font-bold p-2 bg-white rounded-lg border border-brand-border focus:outline-none focus:ring-0"
                                                         />
                                                      </div>
                                                      <p className="text-xs align-bottom mt-4 font-bold opacity-30">/ {selectedAssignment.points}</p>
                                                   </div>
                                                   <div>
                                                      <label className="block text-[8px] font-bold uppercase text-brand-text/30 tracking-widest mb-1">Feedback Message</label>
                                                      <textarea 
                                                         placeholder="Exceptional response. Here is your feedback..."
                                                         value={gradingFeedback}
                                                         onChange={(e) => setGradingFeedback(e.target.value)}
                                                         className="w-full h-16 text-xs p-2 bg-white rounded-lg border border-brand-border focus:outline-none focus:ring-0 font-serif"
                                                      />
                                                   </div>
                                                   <div className="flex gap-2">
                                                      <button 
                                                         type="button"
                                                         onClick={() => setActiveGradingId(null)}
                                                         className="flex-1 py-1.5 rounded-lg border border-brand-border text-[9px] font-bold text-brand-text/40 hover:text-brand-text uppercase tracking-wider cursor-pointer"
                                                      >
                                                         Cancel
                                                      </button>
                                                      <button 
                                                         type="button"
                                                         onClick={() => handleGradeSubmission(sub.id)}
                                                         className="flex-1 bg-brand-text text-white py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
                                                      >
                                                         Save Grade
                                                      </button>
                                                   </div>
                                                </motion.div>
                                             ) : (
                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      setActiveGradingId(sub.id);
                                                      setGradingScore(sub.grade || selectedAssignment.points);
                                                      setGradingFeedback(sub.feedback || '');
                                                   }}
                                                   className="text-[9px] font-bold uppercase text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                                                >
                                                   <Award className="w-3.5 h-3.5" />
                                                   {sub.status === 'graded' ? 'Revise Score / Feedback' : 'Score Assignment'}
                                                </button>
                                             )}
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>
                        )}
                     </div>

                     <div className="pt-6 border-t border-brand-border flex justify-end mt-6 md:mt-12">
                        <button 
                           onClick={() => setSelectedAssignment(null)}
                           className="bg-brand-text text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                           Done Viewing
                        </button>
                     </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
