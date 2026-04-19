import React, { useState } from 'react';

/**
 * MatchFeedback Component
 * Allows users to rate the accuracy of a job match and provide comments.
 * This data is used to optimize matching weights in A/B tests.
 */
const MatchFeedback = ({ jobId, initialScore, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/feedback/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          job_id: jobId,
          rating,
          comments,
          match_score: initialScore
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitted(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted({ rating, comments });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-700 font-medium">Thank you for your feedback! ✨</p>
        <p className="text-sm text-green-600">Your input helps us improve your job matches.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800 mb-1">How accurate is this match?</h4>
      <p className="text-xs text-slate-500 mb-4">Predicted score: {Math.round(initialScore)}%</p>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center space-x-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`text-2xl transition-colors duration-150 ${
                star <= (hover || rating) ? 'text-amber-400' : 'text-slate-200'
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            >
              ★
            </button>
          ))}
          <span className="text-xs font-medium text-slate-400 ml-2">
            {rating > 0 ? `${rating}/5` : 'Rate'}
          </span>
        </div>

        <textarea
          className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none mb-3"
          placeholder="Optional: What could be better? (e.g. skills, location...)"
          rows="2"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting || rating === 0}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            submitting || rating === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-[0.98]'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default MatchFeedback;
