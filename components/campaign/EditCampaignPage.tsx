'use client';

import styles from './EditCampaignPage.module.css';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getGameSystem } from '@/lib/game-systems/registry';
import { resizeCoverImage } from '@/lib/images/resize-cover-image';
import {
  COVER_IMAGE_MAX_BYTES,
  COVER_IMAGE_MAX_DIMENSION_PX,
  PDF_COVER_MAX_BYTES,
} from '@/lib/images/cover-image-constants';

interface EditCampaignPageProps {
  id: string;
  initialName: string;
  initialModuleDescription: string;
  initialGameSystem: string;
  initialCoverImageUrl: string | null;
}

export function EditCampaignPage({
  id,
  initialName,
  initialModuleDescription,
  initialGameSystem,
  initialCoverImageUrl,
}: EditCampaignPageProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [moduleDescription, setModuleDescription] = useState(initialModuleDescription);
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl);
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [coverImageError, setCoverImageError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const gameSystem = getGameSystem(initialGameSystem);

  const handleCoverImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCoverImageError('');

    const isPdf = file.type === 'application/pdf';
    const maxBytes = isPdf ? PDF_COVER_MAX_BYTES : COVER_IMAGE_MAX_BYTES;
    if (file.size > maxBytes) {
      setCoverImageError(`${isPdf ? 'PDF' : 'Image'} must be ${maxBytes / (1024 * 1024)}MB or smaller.`);
      return;
    }

    setCoverImageUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const path = `${user.id}/${id}/cover.jpg`;

      if (isPdf) {
        // Rasterization needs @napi-rs/canvas, a Node native addon that can't
        // run in the browser — the server route does the work and writes
        // straight to the same storage path the image branch below uses.
        const response = await fetch(`/api/campaigns/${id}/cover-from-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/pdf' },
          body: file,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? 'Failed to process PDF.');
        }
      } else {
        const resized = await resizeCoverImage(file, COVER_IMAGE_MAX_DIMENSION_PX);
        const { error: uploadError } = await supabase.storage
          .from('campaign-covers')
          .upload(path, resized, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('campaign-covers').getPublicUrl(path);
      // Cache-bust so the new upload shows immediately even though the path is unchanged.
      setCoverImageUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (err) {
      setCoverImageError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setCoverImageUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          name: name.trim(),
          module_description: moduleDescription.trim() || null,
          cover_image_url: coverImageUrl,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push(`/campaigns/${id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.editCampaignRoot}>
      <h1 className={styles.pageTitle}>Edit Campaign</h1>

      <div className={styles.formCard}>
        <p className={styles.formCardTitle}>Campaign Details</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Cover Image</label>
            <div className={styles.coverImageRow}>
              <div className={styles.coverImagePreview}>
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImageUrl} alt="" className={styles.coverImagePreviewImg} />
                ) : (
                  <ImageIcon className={styles.coverImagePlaceholder} />
                )}
              </div>
              <div className={styles.coverImageControls}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => void handleCoverImageChange(e)}
                  className={styles.coverImageFileInput}
                  id="coverImageFile"
                  disabled={coverImageUploading}
                />
                <label
                  htmlFor="coverImageFile"
                  className={styles.btnCoverUpload}
                  aria-disabled={coverImageUploading}
                >
                  {coverImageUploading ? 'Uploading…' : coverImageUrl ? 'Replace Cover' : 'Upload Cover'}
                </label>
                {coverImageUrl && (
                  <button
                    type="button"
                    className={styles.btnCoverRemove}
                    onClick={() => setCoverImageUrl(null)}
                    disabled={coverImageUploading}
                  >
                    Remove
                  </button>
                )}
                <p className={styles.formHint}>
                  JPG or PNG up to 5MB, or a single-page PDF up to 8MB (e.g. print just the cover page of a
                  module to PDF and upload that). Full cover shown, not cropped.
                </p>
                {coverImageError && <p className={styles.errorMsg}>{coverImageError}</p>}
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Campaign Name *
            </label>
            <input
              id="name"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="moduleDescription" className={styles.formLabel}>
              Module &amp; Campaign Info
            </label>
            <p className={styles.formHint}>
              What module or setting are you running? Note any supplements, player kits, or house rules the GM should know about.
            </p>
            <textarea
              id="moduleDescription"
              className={styles.formTextarea}
              placeholder="e.g., Palace of the Silver Princess (B3), using Tasha's expanded options, no multiclassing — or describe your homebrew adventure and house rules"
              value={moduleDescription}
              onChange={(e) => setModuleDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Game System</label>
            <div className={styles.systemLocked}>
              <p className={styles.systemName}>{gameSystem?.name ?? initialGameSystem}</p>
              {gameSystem && <p className={styles.systemDescription}>{gameSystem.description}</p>}
            </div>
            <p className={styles.formHint}>
              The game system is locked once a campaign is created and can&apos;t be changed.
              Start a new campaign to play a different system.
            </p>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.formActions}>
            <button type="submit" disabled={loading} className={styles.btnSubmit}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => router.push(`/campaigns/${id}`)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
