import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getActiveInductionContents, completeInduction } from '../api/safety-inductions.api';
import { type InductionContent, type InductionConfig } from '../types/induction';
import { Icon } from '../components/Icon';
import { DevFillButton } from '../components/DevFillButton';
import k3Video from '../assets/VIDEO K3 BMC VERSi TAMU  FINAL durasi 3.55.mov';
import safetyRidingImage from '../assets/IMBAUAN BMC SAFETY RIDING.png';

function resolveContentUrl(content: InductionContent): string {
  if (content.ContentUrl === 'asset://bmc-k3-video') return k3Video;
  if (content.ContentUrl === 'asset://bmc-safety-riding') return safetyRidingImage;
  return content.ContentUrl;
}

export function SafetyInductionPage() {
  const { visitId } = useParams<{ visitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [induction, setInduction] = useState<InductionConfig | null>(null);
  const [contents, setContents] = useState<InductionContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [visitorId, setVisitorId] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalRequired, setTotalRequired] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadContents();
  }, []);

  async function loadContents() {
    try {
      const data = await getActiveInductionContents();
      setInduction(data.induction);
      setContents(data.contents);

      const vid = searchParams.get('visitorId');
      if (vid) {
        setVisitorId(parseInt(vid, 10));
      }
      const total = searchParams.get('total');
      if (total) {
        setTotalRequired(parseInt(total, 10));
      }
      const completed = searchParams.get('completed');
      if (completed) {
        setCompletedCount(parseInt(completed, 10));
      }
    } catch {
      setError('Failed to load induction content');
    }
    setLoading(false);
  }

  async function handleComplete() {
    if (!visitorId || !visitId) return;

    setSubmitting(true);
    setError('');

    try {
      await completeInduction({
        visitorId,
        visitId: parseInt(visitId, 10),
        acknowledged: true,
      });
      setCompleted(true);
    } catch {
      setError('Failed to submit acknowledgement');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading induction content...</p>
      </div>
    );
  }

  if (error && !contents.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-700 hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded p-8 max-w-md text-center">
           <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-700"><Icon name="check" size={25} /></div>
          <h2 className="text-lg font-bold mb-2">Induction Complete</h2>
          <p className="text-sm text-gray-600 mb-4">
            You have successfully completed the Safety Induction.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Please inform the security personnel to proceed with check-in.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
          >
            Back to Visit
          </button>
        </div>
      </div>
    );
  }

  const currentContent = contents[currentIndex];
  const isLast = currentIndex === contents.length - 1;
  const currentContentUrl = resolveContentUrl(currentContent);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-blue-900">Safety Induction</h1>
            {induction && (
              <p className="text-xs text-gray-500">{induction.title} — V{induction.version}</p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {completedCount} / {totalRequired || contents.length} Completed
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white border rounded mb-4">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-sm font-medium">
              Content {currentIndex + 1} of {contents.length}
            </p>
          </div>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-2">{currentContent.Title || `Content ${currentIndex + 1}`}</h2>
            {currentContent.Description && (
              <p className="text-sm text-gray-600 mb-4">{currentContent.Description}</p>
            )}

            <div className="bg-gray-100 rounded p-4 text-center mb-4">
              {currentContent.ContentType === 'VIDEO' ? (
                <video className="w-full max-h-[520px] rounded" controls preload="metadata" src={currentContentUrl} />
              ) : currentContent.ContentType === 'PDF' ? (
                <iframe className="w-full h-[520px] rounded bg-white" src={currentContentUrl} title={currentContent.Title || 'Safety induction document'} />
              ) : (
                <img className="mx-auto max-h-[520px] w-auto rounded object-contain" src={currentContentUrl} alt={currentContent.Title || 'Safety induction content'} />
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex(i => i - 1)}
                disabled={currentIndex === 0}
                className="text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                disabled={isLast}
                className="text-sm px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {isLast && (
          <div className="bg-white border rounded p-6">
             <div className="flex items-center justify-between gap-3 mb-4">
               <h3 className="font-medium mb-0">Acknowledgement</h3>
               <DevFillButton onClick={() => setAcknowledged(true)} label="Centang contoh" />
             </div>
            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                Saya sudah melihat, membaca/menonton, dan memahami Safety Induction yang diberikan.
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <button
              onClick={handleComplete}
              disabled={!acknowledged || submitting}
              className="w-full text-sm px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Complete Induction'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
