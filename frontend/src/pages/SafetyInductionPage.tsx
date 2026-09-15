import { useState, useEffect, useRef, type SyntheticEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getActiveInductionContents, completeGroupInduction, getInductionWorkflow, type InductionWorkflow } from '../api/safety-inductions.api';
import { type InductionContent, type InductionConfig } from '../types/induction';
import { Icon } from '../components/Icon';
import { DevFillButton } from '../components/DevFillButton';
import { EmptyState } from '../components/AsyncState';
import k3Video from '../assets/VIDEO K3 BMC VERSi TAMU  FINAL durasi 3.55.mov';
import safetyRidingImage from '../assets/IMBAUAN BMC SAFETY RIDING.png';

function resolveContentUrl(content: InductionContent): string {
  if (content.ContentUrl === 'asset://bmc-k3-video') return k3Video;
  if (content.ContentUrl === 'asset://bmc-safety-riding') return safetyRidingImage;
  return content.ContentUrl;
}

export function SafetyInductionPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [induction, setInduction] = useState<InductionConfig | null>(null);
  const [contents, setContents] = useState<InductionContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [workflow, setWorkflow] = useState<InductionWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const maxVideoTime = useRef(0);

  useEffect(() => {
    loadContents();
  }, []);

  useEffect(() => {
    maxVideoTime.current = 0;
    setVideoCompleted(false);
  }, [currentIndex]);

  async function loadContents() {
    try {
      if (!token) throw new Error('Invalid induction token');
       const workflowData = await getInductionWorkflow(token);
       const data = await getActiveInductionContents(workflowData.purposeCategory);
      setInduction(data.induction);
      setContents(data.contents);
      setWorkflow(workflowData);

    } catch {
      setError('Failed to load induction content');
    }
    setLoading(false);
  }

  async function handleComplete() {
    if (!token || !workflow || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      await completeGroupInduction({
        token,
        visitorIds: workflow.visitors.map((visitor) => visitor.visitorId),
        acknowledged,
      });
      setCompleted(true);
    } catch {
      setError('Failed to submit acknowledgement');
    }
    setSubmitting(false);
  }

  function handleVideoProgress(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    maxVideoTime.current = Math.max(maxVideoTime.current, video.currentTime);
  }

  function preventVideoSeeking(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    // Allow a small browser rounding difference, but never allow jumping ahead.
    if (video.currentTime > maxVideoTime.current + 0.25) {
      video.currentTime = maxVideoTime.current;
    }
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
             Kunjungan grup sudah tercatat masuk. Saat meninggalkan area, silakan informasikan Security untuk melakukan checkout.
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

  if (contents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <EmptyState message="Konten safety induction belum tersedia." />
          <button onClick={() => navigate(-1)} className="mt-4 w-full text-sm text-blue-700 hover:underline">Kembali</button>
        </div>
      </div>
    );
  }

  const currentContent = contents[currentIndex];
  const isLast = currentIndex === contents.length - 1;
  const currentContentUrl = resolveContentUrl(currentContent);
  const completedVisitors = workflow?.completedCount ?? 0;
  const totalVisitors = workflow?.visitors.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-blue-900">Safety Induction</h1>
             <p className="text-sm text-gray-700">Grup visitor: <strong>{workflow?.visitors.length ?? 0} orang</strong></p>
            {induction && (
              <p className="text-xs text-gray-500">{induction.title} — V{induction.version}</p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {completedVisitors} / {totalVisitors} Pengunjung selesai
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white border rounded mb-4">
          <div className="px-4 py-3 border-b bg-gray-50">
             <p className="text-sm font-medium">Safety Induction untuk seluruh grup</p>
          </div>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-2">{currentContent.Title || `Content ${currentIndex + 1}`}</h2>
            {currentContent.Description && (
              <p className="text-sm text-gray-600 mb-4">{currentContent.Description}</p>
            )}

            <div className="bg-gray-100 rounded p-4 text-center mb-4">
              {currentContent.ContentType === 'VIDEO' ? (
                <video
                  className="w-full max-h-[520px] rounded"
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  src={currentContentUrl}
                  onTimeUpdate={handleVideoProgress}
                  onSeeking={preventVideoSeeking}
                  onEnded={() => setVideoCompleted(true)}
                >
                  Video tidak dapat diputar pada perangkat ini.
                </video>
              ) : currentContent.ContentType === 'PDF' ? (
                <>
                  <iframe className="w-full h-[520px] rounded bg-white" src={currentContentUrl} title={currentContent.Title || 'Dokumen safety induction'} />
                  <a className="inline-block mt-2 text-sm text-blue-700 hover:underline" href={currentContentUrl} target="_blank" rel="noreferrer">Buka dokumen di tab baru</a>
                </>
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
                 disabled={isLast || (currentContent.ContentType === 'VIDEO' && !videoCompleted)}
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
                <h3 className="font-medium mb-0">Konfirmasi seluruh visitor</h3>
               <DevFillButton onClick={() => setAcknowledged(true)} label="Centang contoh" />
             </div>
            <label className="flex items-start gap-3 cursor-pointer mb-4">
               <input
                 id="induction-acknowledgement"
                 type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                 className="mt-1"
                 aria-describedby="induction-acknowledgement-help"
               />
                <span id="induction-acknowledgement-help" className="text-sm text-gray-700">Saya memastikan seluruh visitor dalam daftar sudah melihat, membaca/menonton, dan memahami Safety Induction yang diberikan.</span>
            </label>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <button
              onClick={handleComplete}
              disabled={!acknowledged || submitting || (currentContent.ContentType === 'VIDEO' && !videoCompleted)}
              className="w-full text-sm px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-40"
            >
               {submitting ? 'Menyimpan...' : 'Submit dan Check-in Grup'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
