'use client';

import { useState, type FormEvent } from 'react';
import { addCampaignVideo, type CampaignVideo } from '@/lib/campaigns/campaign-videos';
import styles from './AddYoutubeVideoForm.module.css';

interface AddYoutubeVideoFormProps {
  campaignId: string;
  /** Distinguishes input ids when the form appears twice on one page (panel + picker). */
  idPrefix: string;
  onAdded: (video: CampaignVideo) => void;
}

/** Paste-a-link form shared by the Scene Library panel and the in-session scene picker. */
export default function AddYoutubeVideoForm({ campaignId, idPrefix, onAdded }: AddYoutubeVideoFormProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url.trim() || saving) return;

    setError('');
    setSaving(true);
    const { video, error: addError } = await addCampaignVideo(campaignId, url, title);
    setSaving(false);

    if (addError || !video) {
      setError(addError ?? 'Could not add that video.');
      return;
    }
    setUrl('');
    setTitle('');
    onAdded(video);
  };

  return (
    <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
      <label htmlFor={`${idPrefix}-video-url`} className={styles.label}>
        Add a YouTube video
      </label>
      <input
        id={`${idPrefix}-video-url`}
        type="url"
        className={styles.input}
        placeholder="https://www.youtube.com/watch?v=…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={saving}
      />
      <input
        id={`${idPrefix}-video-title`}
        type="text"
        className={styles.input}
        placeholder="Title (optional)"
        aria-label="Video title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={saving}
        maxLength={120}
      />
      <button type="submit" className={styles.btnAdd} disabled={saving || !url.trim()}>
        {saving ? 'Adding…' : '+ Add Video'}
      </button>
      {error && <p className={styles.errorMsg}>{error}</p>}
    </form>
  );
}
